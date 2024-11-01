#!/bin/bash
echo 'run after_install.sh: ' >> /home/ubuntu/ece461-p2/logs/deploy.log

echo 'cd /home/ubuntu/ece461-p2' >> /home/ubuntu/ece461-p2/logs/deploy.log
cd /home/ubuntu/ece461-p2 >> /home/ubuntu/ece461-p2/logs/deploy.log

echo 'npm install' >> /home/ubuntu/ece461-p2/logs/deploy.log 
npm install >> /home/ubuntu/ece461-p2/logs/deploy.log

echo 'npm run build' >> /home/ubuntu/ece461-p2/logs/deploy.log
npm run build >> /home/ubuntu/ece461-p2/logs/deploy.log

echo 'npm run start' >> /home/ubuntu/ece461-p2/logs/deploy.log
npm run start >> /home/ubuntu/ece461-p2/logs/deploy.log
