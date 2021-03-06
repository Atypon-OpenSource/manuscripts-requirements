#!groovy
node {
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
        nodejs(nodeJSInstallationName: 'node 12.22.1') {
            sh (script: "yarn install --network-timeout 300000 --frozen-lockfile --non-interactive", returnStdout: true)
            sh (script: "yarn run typecheck", returnStdout: true)
            sh (script: "yarn run lint", returnStdout: true)
            sh (script: "yarn run test", returnStdout: true)
            sh (script: "yarn run build", returnStdout: true)
        }
    }

    if (VARS.GIT_BRANCH == "origin/master") {
        stage ("Publish") {
            withCredentials([string(credentialsId: 'NPM_TOKEN_MANUSCRIPTS_OSS', variable: 'NPM_TOKEN')]) {
                container('nodeslim') {
                    sh ("npx @manuscripts/publish")
                }
            }
        }
    }
}
