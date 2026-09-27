pipeline {
    agent { label 'Node' }

    environment {
        SONAR_HOME      = tool 'Sonar'
        DOCKER_USER     = 'aruhehe'
        BACKEND_IMAGE   = 'aruhehe/kubepay-backend'
        FRONTEND_IMAGE  = 'aruhehe/kubepay-frontend'
        // Auto-pilot: Uses Jenkins BUILD_NUMBER (1, 2, 3...) automatically
        TAG             = "${params.DOCKER_TAG ?: env.BUILD_NUMBER}"
    }

    parameters {
        string(name: 'DOCKER_TAG', defaultValue: '', description: 'Optional custom tag. Leave empty to auto-use Jenkins BUILD_NUMBER')
    }

    stages {
        stage('Workspace Cleanup') {
            steps {
                cleanWs()
            }
        }

        stage('Git: Code Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/ARPITPRAJAPATI/Advance_bank_system.git'
            }
        }

        stage('Trivy: Filesystem Scan') {
            steps {
                sh "trivy fs --format table -o trivy-fs-report.html ."
            }
        }

        stage('SonarQube: Code Analysis') {
            steps {
                withSonarQubeEnv('Sonar') {
                    sh """
                        $SONAR_HOME/bin/sonar-scanner \
                            -Dsonar.projectName=KubePay \
                            -Dsonar.projectKey=KubePay \
                            -Dsonar.sources=backend,frontend \
                            -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/.git/**
                    """
                }
            }
        }

        stage('SonarQube: Quality Gate') {
            steps {
                script {
                    waitForQualityGate abortPipeline: false, credentialsId: 'sonar-token'
                }
            }
        }

        stage('OWASP: Dependency-Check') {
            steps {
                dependencyCheck additionalArguments: '--scan ./ --disableYarnAudit --disableNodeAudit --format XML --nvdApiKey 85E00693-0DD1-4343-A874-97B42E144F64', odcInstallation: 'OWASP'
                dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
            }
        }

        stage('Docker: Build & Push Images') {
            steps {
                script {
                    withDockerRegistry([credentialsId: 'docker', url: '']) {
                        // Build & Push Backend (Both version tag and latest alias)
                        sh "docker build -t ${BACKEND_IMAGE}:${TAG} -t ${BACKEND_IMAGE}:latest ./backend"
                        sh "docker push ${BACKEND_IMAGE}:${TAG}"
                        sh "docker push ${BACKEND_IMAGE}:latest"

                        // Build & Push Frontend (Both version tag and latest alias)
                        sh "docker build -t ${FRONTEND_IMAGE}:${TAG} -t ${FRONTEND_IMAGE}:latest ./frontend"
                        sh "docker push ${FRONTEND_IMAGE}:${TAG}"
                        sh "docker push ${FRONTEND_IMAGE}:latest"
                    }
                }
            }
        }

        stage('Trivy: Container Image Scan') {
            steps {
                sh "trivy image --format table -o trivy-backend-image.html ${BACKEND_IMAGE}:${TAG}"
                sh "trivy image --format table -o trivy-frontend-image.html ${FRONTEND_IMAGE}:${TAG}"
            }
        }

        stage('Trigger: GitOps CD Pipeline') {
            steps {
                script {
                    echo "🚀 Triggering GitOps CD Pipeline with Tag: ${TAG}..."
                    build job: "KubePay-CD", parameters: [
                        string(name: 'BACKEND_DOCKER_TAG', value: "${TAG}"),
                        string(name: 'FRONTEND_DOCKER_TAG', value: "${TAG}")
                    ], wait: false
                }
            }
        }
    }

    post {
        always {
            // Keep security reports as artifacts in Jenkins
            archiveArtifacts artifacts: '*.html, **/dependency-check-report.xml', allowEmptyArchive: true
            echo "🎉 CI Pipeline Finished! Deployed images tagged with ${TAG}"
        }
        failure {
            echo "CI Pipeline Failed. Please check the logs above."
            emailext (
                attachLog: true,
                to: "arpitprajapati2005@gmail.com",
                subject: "🚨 [FAILED] Kube Pay CI Pipeline - Build #${env.BUILD_NUMBER}",
                mimeType: 'text/html',
                body: """
                    <!DOCTYPE html>
                    <html>
                    <body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 20px;">
                        <div style="max-width: 600px; margin: auto; background-color: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #ef4444;">
                            <h2 style="color: #ef4444; margin-top: 0;">🚨 CI Pipeline Failed!</h2>
                            <p style="color: #94a3b8;">One of the CI stages (Trivy, SonarQube, OWASP, or Docker Build) has failed.</p>
                            <p><strong>Job:</strong> ${env.JOB_NAME}</p>
                            <p><strong>Build Number:</strong> #${env.BUILD_NUMBER}</p>
                            <div style="margin-top: 20px;">
                                <a href="${env.BUILD_URL}console" style="background-color: #ef4444; color: white; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: bold;">Inspect Failure Logs</a>
                            </div>
                        </div>
                    </body>
                    </html>
                """
            )
        }
    }
}
