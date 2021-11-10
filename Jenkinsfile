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
