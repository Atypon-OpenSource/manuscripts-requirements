#!groovy
podTemplate(
    cloud: 'kubernetes',
    namespace: 'qa-reports',
    yaml: """
apiVersion: v1
kind: Pod
metadata:
  name: jenkins-agent
  labels:
    app: jenkins-agent
    app.kubernetes.io/name: manuscripts
    app.kubernetes.io/instance: requirements
spec:
  serviceAccount: default
  nodeSelector:
    beta.kubernetes.io/os: linux
  containers:
  - name: nodeslim
    image: "node:12-slim"
    imagePullPolicy: Always
    command: ["cat"]
    tty: true
    resources:
      limits:
        cpu: 1024m
        memory: 2048Mi
      requests:
        cpu: 100m
        memory: 256Mi
"""
) {
    node(POD_LABEL) {
        REFSPEC="+refs/pull/*:refs/remotes/origin/pr/*"
        stage("Checkout") {
            if (params != null && params.ghprbPullId == null) {
                echo 'Checking out from master'
                // master needs to be substituted with the release branch.
                REFSPEC="+refs/heads/master:refs/remotes/origin/master"
            }
            VARS = checkout(scm:[$class: 'GitSCM', branches: [[name: "${sha1}"]],
                doGenerateSubmoduleConfigurations: false,
                submoduleCfg: [],
                userRemoteConfigs: [
                    [credentialsId: '336d4fc3-f420-4a3e-b96c-0d0f36ad12be',
                    name: 'origin',
                    refspec: "${REFSPEC}",
                    url: 'git@github.com:Atypon-OpenSource/manuscripts-requirements.git']
                ]]
            )
        }
        stage("Build") {
            container('nodeslim') {
                sh (script: "yarn install --frozen-lockfile --non-interactive", returnStdout: true)
                sh (script: "yarn run typecheck", returnStdout: true)
                sh (script: "yarn run lint", returnStdout: true)
                sh (script: "yarn run test", returnStdout: true)
                sh (script: "yarn run build", returnStdout: true)
            }
        }

        if (VARS.GIT_BRANCH == "origin/master") {
            stage ("Publish") {
                sh ("npx @manuscripts/publish")
            }
        }
    }
}
