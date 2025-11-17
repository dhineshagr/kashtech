pipeline {
    agent any

    environment {
        IMAGE_NAME = "dhineshagr/kashtech"
        IMAGE_TAG = "build-${BUILD_NUMBER}"
        DOCKER_IMAGE = "${IMAGE_NAME}:${IMAGE_TAG}"
        LATEST_TAG = "${IMAGE_NAME}:latest"
        REMOTE_HOST = "130.131.68.35"
        CONTAINER_NAME = "kashtech"
        APP_PORT = "3000"
        EXPOSED_PORT = "3000"
        HOST_KEY = "ssh-ed25519 255 SHA256:JxFVN977xOlQnGfVKWXZvv+60A/VzBKsEU0rpP5+uOw"
        SSH_KEY_PATH = "C:\KASH-TECH\Deployment\Kash-Operations-Server-New\Kash-Operations-Server-New.ppk"
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/dhineshagr/kashtech.git'
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm install'
            }
        }

        stage('Build React App') {
            steps {
                bat 'npm run build'
            }
        }

        stage('Build Docker Image') {
            steps {
                bat "docker build -t ${DOCKER_IMAGE} -t ${LATEST_TAG} ."
            }
        }

        stage('Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'docker-hub-creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    bat """
                        echo %DOCKER_PASS% | docker login -u %DOCKER_USER% --password-stdin
                        docker push ${DOCKER_IMAGE}
                        docker push ${LATEST_TAG}
                    """
                }
            }
        }

        stage('Deploy to Dev Server') {
            steps {
                bat """
                    plink -batch -i "${SSH_KEY_PATH}" ^
                    -hostkey "${HOST_KEY}" ^
                    azureuser@${REMOTE_HOST} ^
                    "docker rm -f ${CONTAINER_NAME} || true && docker pull ${LATEST_TAG} && docker run -d --restart unless-stopped -p ${EXPOSED_PORT}:${APP_PORT} --name ${CONTAINER_NAME} ${LATEST_TAG}"
                """
            }
        }
    }

    post {
        success {
            echo "✅ Successfully built and deployed: ${DOCKER_IMAGE}"
        }
        always {
            echo '📦 Pipeline finished!'
        }
    }
}
