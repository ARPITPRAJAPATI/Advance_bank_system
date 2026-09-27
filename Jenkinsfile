pipeline {
    agent { label 'Node' }

    environment {
        SONAR_HOME      = tool 'Sonar'
        DOCKER_USER     = 'aruhehe'
        BACKEND_IMAGE   = 'aruhehe/kubepay-backend'
        FRONTEND_IMAGE  = 'aruhehe/kubepay-frontend'
    }

    parameters {
        string(name: 'BACKEND_DOCKER_TAG', defaultValue: 'latest', description: 'Docker image tag for Backend')
        string(name: 'FRONTEND_DOCKER_TAG', defaultValue: 'latest', description: 'Docker image tag for Frontend')
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
                dependencyCheck additionalArguments: '--scan ./ --disableYarnAudit --disableNodeAudit', odcInstallation: 'OWASP'
                dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
            }
        }

        stage('Docker: Build & Push Images') {
            steps {
                script {
                    withDockerRegistry([credentialsId: 'docker', url: '']) {
                        // Build & Push Backend
                        sh "docker build -t ${BACKEND_IMAGE}:${params.BACKEND_DOCKER_TAG} ./backend"
                        sh "docker push ${BACKEND_IMAGE}:${params.BACKEND_DOCKER_TAG}"

                        // Build & Push Frontend
                        sh "docker build -t ${FRONTEND_IMAGE}:${params.FRONTEND_DOCKER_TAG} ./frontend"
                        sh "docker push ${FRONTEND_IMAGE}:${params.FRONTEND_DOCKER_TAG}"
                    }
                }
            }
        }

        stage('Trivy: Container Image Scan') {
            steps {
                sh "trivy image --format table -o trivy-backend-image.html ${BACKEND_IMAGE}:${params.BACKEND_DOCKER_TAG}"
                sh "trivy image --format table -o trivy-frontend-image.html ${FRONTEND_IMAGE}:${params.FRONTEND_DOCKER_TAG}"
            }
        }
    }

    post {
        always {
            // Keep security reports as artifacts in Jenkins
            archiveArtifacts artifacts: '*.html, **/dependency-check-report.xml', allowEmptyArchive: true
        }
        success {
            echo "🎉 CI Pipeline Completed Successfully! Images pushed to DockerHub as ${params.IMAGE_TAG}"
        }
        failure {
            echo "❌ CI Pipeline Failed. Please check the logs above."
        }
    }
}
