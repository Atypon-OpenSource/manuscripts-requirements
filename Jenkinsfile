#!groovy
node {
    stage("stage1") {
        echo 'hello'
    }
    // DOCKER_REG='docker-reg.atypon.com'
    // DOCKER_IMAGE="${DOCKER_REG}/ai/dat"

    // REFSPEC="+refs/pull/*:refs/remotes/origin/pr/*"

    // stage("checkout code") {
    //     if (params != null && params.ghprbPullId == null) {
    //         echo 'Checking out from master'
    //         // master needs to be substituted with the release branch.
    //         REFSPEC="+refs/heads/master:refs/remotes/origin/master"
    //     }
    //     VARS = checkout(scm:
    //         [$class: 'GitSCM',
    //         branches: [[name: "${sha1}"]],
    //         doGenerateSubmoduleConfigurations: false,
    //         extensions: [[$class: 'CleanBeforeCheckout']],
    //         submoduleCfg: [],
    //         userRemoteConfigs: [
    //             [credentialsId: '336d4fc3-f420-4a3e-b96c-0d0f36ad12be',
    //             name: 'origin',
    //             refspec: "${REFSPEC}",
    //             url: 'git@github.com:atypon/Deep-AutoTagger.git']
    //         ]]
    //     )
    //     echo "$VARS"
    // }

    // stage("Copy model") {
    //     sh "mkdir -p autotagger_model"
    //     sh "tar -xvf ~/var/autotagger/autotaggerModel.tar.gz"
    // }

    // stage("Run tests") {
    //     env.SOURCE='XXX'
    //     sh """
    //     virtualenv venv
    //     . ./venv/bin/activate
    //     pip install --upgrade pip
    //     pip install -r requirements_prod.txt
    //     python2 -c "import nltk; nltk.download('stopwords')"
    //     python2 run_tests.py
    //     """

    //     publishHTML(target: [
    //         allowMissing: false,
    //         alwaysLinkToLastBuild: true,
    //         keepAll: true,
    //         reportDir: 'tests/',
    //         reportFiles: '*.html',
    //         reportName: "Test Coverage"
    //     ])
    // }


    // stage("Build docker image") {
    //     sh "docker build -t ${DOCKER_IMAGE}:stable ."
    // }

    // stage("Push to docker registry") {
    //     sh "docker push ${DOCKER_IMAGE}:stable"
    // }

    // // GIT_BRANCH comes from the git plugin, and it is always set
    // if (VARS.GIT_BRANCH == "origin/master") {
    //     stage("Deploy to kubernetes cluster") {
    //         // call rundeck deploy job
    //         echo '[INFO] WILL DEPLOY SERVICE USING RUNDECK'
    //         step([
    //             $class: "RundeckNotifier",
    //             rundeckInstance: "DC Rundeck",
    //             jobId: "0ded4753-5904-41f6-b3b5-00978541f41b",
    //             options: """
    //                         jenkinsJob=${BUILD_URL}
    //                         commitHash=${VARS.GIT_COMMIT}
    //                         """,
    //             nodeFilters: "",
    //             tags: "",
    //             shouldWaitForRundeckJob: true,
    //             shouldFailTheBuild: true,
    //             notifyOnAllStatus: false,
    //             tailLog: true,
    //             includeRundeckLogs: true
    //         ])
    //     }
    // }
}