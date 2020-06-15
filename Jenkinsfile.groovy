/**
 * Build the Google Meet App service and push the resulting image into the ECR..
 *
 * https://jenkins-kubernetes.dev.bbpd.io/view/Sandbox/job/cclark/job/google-meet/job/build-google-meet/
 */

@Library( [ 'bb-common@1.x', 'bb-microservices@2.x' ] ) _

properties([
  disableConcurrentBuilds(),
  buildDiscarder(logRotator(daysToKeepStr: '180', numToKeepStr: '30')),
  parameters( [
    booleanParam( name: 'PUSH',
      defaultValue: true,
      description: 'Push built images to ECR' ),
    string( name: 'REPOSITORY_URL',
      defaultValue: '392477962641.dkr.ecr.us-east-1.amazonaws.com/learn-svc/interactive-video-service',
      description: 'The repository url containing the built docker images' ),
  ] )
])

bb.pod.create(
  label: 'googlemeet-app',
  annotations: [
    podAnnotation( key: 'iam.amazonaws.com/role', value: 'arn:aws:iam::392477962641:role/learn-ci-jenkins-agent' ),
  ],
  containers: [
    bb.containers.dockerBuildServer(
      resourceRequestCpu: '1',
      resourceRequestMemory: '2Gi',
    ),
    containerTemplate(name: 'aws', image: 'mesosphere/aws-cli', ttyEnabled: true, command: '/bin/cat', envVars: [
      containerEnvVar(key: 'AWS_DEFAULT_REGION', value: 'us-east-1'),
    ]),
  ],
  volumes: [
    emptyDirVolume(mountPath: '/var/lib/docker', memory: false),
  ],
) {
  timestamps {
    stage( 'Checkout' ) {
      checkout scm
    }

    escapedBranchName = env.BRANCH_NAME.replaceAll(/[^a-zA-Z0-9]/, "_")
    tag = "${escapedBranchName}-${BUILD_NUMBER}"

    if ( !bbms.git.isMasterBranch() ) {
      tag = "ci-$tag"
    }

    bb.stash.notifier {
        stage( 'Build Images' ) {
          container( 'docker' ) {
            bbms.docker.build( image: params.REPOSITORY_URL,
                               tag: 'latest',
                               directory: '.',
                               dockerfile: 'Dockerfile' )
          }
        }

        if ( params.PUSH ) {
          stage( 'Push Images' ) {
            currentBuild.description += "\nTagged: ${tag}"
            currentBuild.description += "\nPushed to: ${params.REPOSITORY_URL}"

            container( 'docker' ) {
              bbms.docker.tag( image: params.REPOSITORY_URL, source: 'latest', destination: tag )
              bbms.docker.push( image: params.REPOSITORY_URL, tag: tag )
              bbms.docker.push( image: params.REPOSITORY_URL, tag: 'latest' )
            }
          }
        }
    }
  }
}
