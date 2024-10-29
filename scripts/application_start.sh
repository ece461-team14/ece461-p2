#!/bin/bash
# application_start.sh
# Description: Restarts the application using PM2, with logs recorded for tracking purposes.
# Date: October 29, 2024
# Dependencies: pm2
# Contributors: (add contributors)

echo 'run application_start.sh: ' >> /home/ubuntu/ece461-p2/logs/deploy.log
echo 'pm2 restart TPR' >> /home/ubuntu/ece461-p2/logs/deploy.log
pm2 restart TPR >> /home/ubuntu/ece461-p2/logs/deploy.log
