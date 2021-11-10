#! groovy

// Create the pipeline jobs for this repository using jobdsl


// Create a release and pr job for repository https://github.com/atypon/Deep-AutoTagger.git

// url for viewing the github repo
def githubWeb = 'https://github.com/Atypon-OpenSource/manuscripts-requirements'

// url used for cloning the source code
def githubSSH = 'git@github.com:Atypon-OpenSource/manuscripts-requirements.git'

// the credential id to use
def credentialID = '336d4fc3-f420-4a3e-b96c-0d0f36ad12be'

def folder_name = "manuscripts"

// First create the folder under Literatum view
folder("${folder_name}") {
    description("Pipeline jobs for manuscripts public repos.")
}

pipelineJob("${folder_name}/manuscipts-requirements") {
    // description("Build a docker image for orient service")
    
    properties {
        githubProjectProperty {
            projectUrlStr("${githubWeb}")
        }
    }
    
    parameters {
        stringParam('sha1', "master", 'Needs to be declared in order for the pipeline parsing to not fail.')
    }


    definition {
        cpsScm {
            scm {
                lightweight(false)
                git {
                    branch('*/master')

                    browser {
                        gitWeb("${githubWeb}")
                    }

                    remote {
                        url("${githubSSH}")
                        credentials("${credentialID}")
                        refspec("+refs/heads/master:refs/remotes/origin/master")
                    }
                }
            }
            scriptPath('Jenkinsfile')
        }
    }
}


// pipelineJob("${folder_name}/orient-pr") {
//     properties {
//         githubProjectProperty {
//             projectUrlStr("${githubWeb}")
//         }
    
//         pipelineTriggers {
//             triggers {
//                 ghprbTrigger {
//                     orgslist('atypon')
//                     triggerPhrase('rerun')
//                     useGitHubHooks(true)
//                     allowMembersOfWhitelistedOrgsAsAdmin(true)
//                     adminlist('')
//                     whitelist('')
//                     cron('')
//                     onlyTriggerPhrase(false)
//                     permitAll(false)
//                     autoCloseFailedPullRequests(false)
//                     displayBuildErrorsOnDownstreamBuilds(false)
//                     commentFilePath('')
//                     skipBuildPhrase('')
//                     blackListCommitAuthor('')
//                     msgSuccess('')
//                     msgFailure('')
//                     commitStatusContext('Jenkins building...')
//                     gitHubAuthId('')
//                     buildDescTemplate('')
//                     blackListLabels('')
//                     whiteListLabels('')
//                     includedRegions('')
//                     excludedRegions('helm/\nJenkinsfile\n*.gdsl')
//                 }
//             }
//         }
//     }

//     definition {
//         cpsScm {
//             scm {
//                 lightweight(false)
//                 git {
//                   	branch('${sha1}')

//                     browser {
//                         gitWeb("${githubWeb}")
//                     }

//                     remote {
//                         url("${githubSSH}")
//                         credentials("${credentialID}")
//                         refspec("+refs/pull/*:refs/remotes/origin/pr/*")
//                     }
//                 }
//             }
//             scriptPath('Jenkinsfile')
//         }
//     }
    
// }

