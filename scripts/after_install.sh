#!/bin/bash
# after_install.sh
# Description: Executes post-installation tasks, including installing dependencies 
#              and building the project, with logs recorded for deployment tracking.
# Date: October 29, 2024
# Dependencies: npm, Node.js
# Contributors: (add contributors)

echo 'run after_install.sh: ' >> /home/ubuntu/ece461-p2/logs/deploy.log

echo 'cd /home/ubuntu/ece461-p2' >> /home/ubuntu/ece461-p2/logs/deploy.log
cd /home/ubuntu/ece461-p2 >> /home/ubuntu/ece461-p2/logs/deploy.log

echo 'npm install' >> /home/ubuntu/ece461-p2/logs/deploy.log 
npm install >> /home/ubuntu/ece461-p2/logs/deploy.log

echo 'npm run build' >> /home/ubuntu/ece461-p2/logs/deploy.log
npm run build >> /home/ubuntu/ece461-p2/logs/deploy.log