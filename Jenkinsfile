#!groovy
podTemplate(
    cloud: 'kubernetes',
    namespace: 'qa-reports',
    yaml: readFile('jobspods.yaml')
) {

    node(POD_LABEL) {
        stage("Build") {
            container('nodeslim') {
                sh (script: "yarn install --frozen-lockfile --non-interactive", returnStdout: true)
                sh (script: "yarn run typecheck", returnStdout: true)
                sh (script: "yarn run lint", returnStdout: true)
                sh (script: "yarn run test", returnStdout: true)
                sh (script: "yarn run build", returnStdout: true)
            }
        }
    }
}
