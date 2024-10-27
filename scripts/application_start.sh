#!/bin/bash
echo 'compile typescript: ' >> /home/ubuntu/ece461-p2/logs/deploy.log
npm run build >> /home/ubuntu/ece461-p2/logs/deploy.log
echo 'run application_start.sh: ' >> /home/ubuntu/ece461-p2/logs/deploy.log
echo 'pm2 restart TPR' >> /home/ubuntu/ece461-p2/logs/deploy.log
pm2 restart TPR >> /home/ubuntu/ece461-p2/logs/deploy.log
