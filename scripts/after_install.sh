#!/bin/bash
echo 'run after_install.sh: ' >> /home/ubuntu/ece461-p2/logs/deploy.log

echo 'cd /home/ec2-user/myrepo' >> /home/ubuntu/ece461-p2/logs/deploy.log
cd /home/ec2-user/myrepo >> /home/ubuntu/ece461-p2/logs/deploy.log

echo 'npm install' >> /home/ubuntu/ece461-p2/logs/deploy.log 
npm install >> /home/ubuntu/ece461-p2/logs/deploy.log
