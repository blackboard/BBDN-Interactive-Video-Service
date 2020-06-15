/**
 * Deploy a specific version of the Google Meet App to a fleet.
 *
 * https://jenkins-kubernetes.dev.bbpd.io/view/Sandbox/job/cclark/job/google-meet/job/deploy-google-meet/
 */

@Library( [ 'bb-common@1.x', 'bb-microservices@2.x' ] ) _

library (identifier: 'bb-fleets@master', retriever: modernSCM(
  [$class: 'GitSCMSource',
   remote: 'ssh://git@stash.bbpd.io/sharedservices/jenkins-fleets.git',
   credentialsId: 'jenkins-stash']))

properties( [
  buildDiscarder( logRotator( daysToKeepStr: '180', numToKeepStr: '30' ) ),
  parameters( [
    stringParam( name: 'IMAGE_TAG', description: 'The image tag to deploy.' ),
    choiceParam( name: 'FLEET_ID', description: 'The ID of the fleet to deploy to. See: jenkins-fleets', choices: fleets.ids() ),
    booleanParam( name: "DRY_RUN", description: 'Only generate a plan, do not apply it.', defaultValue: false ),
    booleanParam( name: "IMPORT", description: 'Try to import existing resources prior to deploying.', defaultValue: false ),
  ] ),
] )

if ( !params.IMAGE_TAG ) {
  error 'No IMAGE_TAG specified.'
}

if ( !params.FLEET_ID ) {
  error 'No FLEET_ID specified.'
}

fleet = fleets.getById( params.FLEET_ID )

echo "Will deploy to fleet: ${fleet.toString()}"

timestamps {
  bb.stash.notifier( includeProjectKey: true ) {
      timeout( time: 30, unit: 'MINUTES', activity: true ) {
        withBuildPod {
          stage( 'Checkout' ) {
            checkout scm
          }

          stage( 'Deploy' ) {
            def tfInitArgs = getInitArgs( fleet )
            def tfVars = getTfVars( fleet ) + tfInitArgs

            currentBuild.description = "$params.IMAGE_TAG ->  $fleet.id"

            lock( "googlemeet::deploy::$params.FLEET_ID" ) {
              container( 'terragrunt' ) {
                withEnv( [ "KUBECONFIG=/etc/kubeconfig/config" ] + tfInitArgs ) {
                  sh "./terragrunt.sh --fleet $fleet.id --service interactive-video-service init -input=false"
                }
                withEnv( [ "KUBECONFIG=/etc/kubeconfig/config" ] + tfVars ) {

                  sh "./terragrunt.sh --fleet $fleet.id --service interactive-video-service plan -input=false"

                  if ( !params.DRY_RUN ) {
                    sh "./terragrunt.sh --fleet $fleet.id --service interactive-video-service apply -input=false -auto-approve .terraform.plan"
                  }
                }
              }
            }

            if ( !params.DRY_RUN ) {
              bbms.kubernetes.validateDeployment(
                deploymentName: 'learn-svc-interactive-video-service',
                timeout: 600,
                namespace: fleet.kubeNamespace,
                kubeConfig: '/etc/kubeconfig',
              )
            }
          }
        }
      }
  }
}

def getTfVars( fleet ) {
  return [
    "TF_VAR_region=$fleet.awsRegion",
    "TF_VAR_fleet=$params.FLEET_ID",
    "TF_VAR_environment=$fleet.environment",
    "TF_VAR_kubernetes_config_context_cluster=$fleet.kubeContext",
    "TF_VAR_k8s_namespace=$fleet.kubeNamespace",
    "TF_VAR_image_tag=$params.IMAGE_TAG",
    "TF_VAR_url_suffix=$fleet.urlSuffix",
  ]
}

def getInitArgs( fleet ) {
  // Define a unique S3 key for each deployment based on configmap name
  def s3Key = "states/interactive-video-service/${fleet.environment}/${fleet.id}.tfstate"
  def bucket = fleet.stateBucket
  def dynamoTable = fleet.stateDynamoTable

  return [
    "STATE_BUCKET=$bucket",
    "STATE_KEY=$s3Key",
    "STATE_REGION=us-east-1",
    "STATE_LOCK=$dynamoTable"
  ]
}

def withBuildPod( Closure block ) {
  bb.pod.create(
    label: 'googlemeet-app-deploy',
    containers: bbms.aws.containerTemplates +
      bbms.kubernetes.containerTemplates +
      bbms.docker.containerTemplates + [
      containerTemplate(
        name: 'terragrunt',
        image: 'alpine/terragrunt:0.12.9',
        command: '/bin/cat',
        ttyEnabled: true
      ),
    ],
    volumes: bbms.docker.containerVolumes + [
      secretVolume( mountPath: '/etc/kubeconfig', secretName: fleet.kubeSecretName ),
    ],
  ) {
    bb.wrapper.colorOutput {
      block()
    }
  }
}
