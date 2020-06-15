/**
 * Deploy a version of Google Meet App to a group of fleets, based on a fleets
 * environment.
 *
 * https://jenkins-kubernetes.dev.bbpd.io/view/Sandbox/job/cclark/job/google-meet/job/deploy-google-meet-group/
 */

@Library( [ 'bb-common@1.x', 'bb-microservices@2.x' ] ) _

deploymentProjectName = 'cclark/google-meet/deploy-google-meet'
upstreamBuildJob = 'cclark/google-meet/build-google-meet/master'

library (identifier: 'bb-fleets@master', retriever: modernSCM(
  [$class: 'GitSCMSource',
   remote: 'ssh://git@stash.bbpd.io/sharedservices/jenkins-fleets.git',
   credentialsId: 'jenkins-stash']))

def activeFleets = [
  'animal-us-east-1-learn-services-cluster01', // animal
  'fozzie-us-east-1-learn-services-playground-cluster01', // fozzie
  'kermit-us-east-1-learn-services-production-cluster01', // kermit prod
]

def environmentGroups = [
  'playground',
  'ci',
  'production',
]

properties( [
  disableConcurrentBuilds(),
  buildDiscarder( logRotator( daysToKeepStr: '180', numToKeepStr: '30' ) ),
  parameters( [
    runParam( name: "UPSTREAM_BUILD", projectName: upstreamBuildJob, filter: "SUCCESSFUL" ),
    choiceParam( name: 'GROUP', choices: environmentGroups,
                 description: 'The environment group to deploy to.' ),
  ] ),
] )

timestamps {
    timeout( time: 30, unit: 'MINUTES', activity: true ) {
      def buildNumber = env.UPSTREAM_BUILD.split( '/' )[-1]
      def deployTag = "master-$buildNumber"
      def groupId = environmentGroups.indexOf( params.GROUP )

      if ( groupId == -1 ) {
        error "No promotions are possible for group $params.GROUP"
      }

      def fleetsToPromote = fleets.all.findAll({ it.environment == environmentGroups[groupId] })
      def confirmation = "Deploying to group ${params.GROUP} will result in the following fleets being updated to ${deployTag}:\n\n"

      fleetsToPromote.each {
        confirmation += "    ${it.toString()}\n"
      }

      input message: confirmation,
        ok: "Deploy"

      currentBuild.description = "$deployTag to $params.GROUP"

      fleetsToPromote.each {
        build job: deploymentProjectName, parameters: [
          string( name: 'FLEET_ID', value: it.id ),
          string( name: 'IMAGE_TAG', value: deployTag ),
        ]
      }
    }
}
