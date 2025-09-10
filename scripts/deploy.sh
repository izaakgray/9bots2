#!/bin/bash

# Discord Bot Deployment Script for DigitalOcean
# This script sets up the bot on a fresh DigitalOcean droplet

set -e

echo "🚀 Starting Discord Bot deployment..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
echo "🔧 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
echo "📁 Installing Git..."
sudo apt install git -y

# Create application directory
echo "📂 Setting up application directory..."
sudo mkdir -p /opt/9bots2
sudo chown $USER:$USER /opt/9bots2
cd /opt/9bots2

# Clone repository (replace with your actual repo URL)
echo "📥 Cloning repository..."
git clone https://github.com/IzaakGrayAg3ncy/9bots2.git .

# Create necessary directories
mkdir -p logs data

# Set up environment file
echo "⚙️ Setting up environment..."
if [ ! -f .env ]; then
    echo "Please create .env file with your Discord bot credentials"
    echo "Required variables: DISCORD_TOKEN, CLIENT_ID"
    exit 1
fi

# Build and start containers
echo "🏗️ Building and starting containers..."
docker-compose build
docker-compose up -d

# Set up systemd service for auto-restart
echo "🔄 Setting up systemd service..."
sudo tee /etc/systemd/system/9bots-discord.service > /dev/null <<EOF
[Unit]
Description=9bots Discord Bot
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/9bots2
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable 9bots-discord.service
sudo systemctl start 9bots-discord.service

# Set up log rotation
echo "📝 Setting up log rotation..."
sudo tee /etc/logrotate.d/9bots-discord > /dev/null <<EOF
/opt/9bots2/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 644 $USER $USER
}
EOF

# Set up auto-update script
echo "🔄 Setting up auto-update script..."
tee update-bot.sh > /dev/null <<EOF
#!/bin/bash
cd /opt/9bots2
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
docker system prune -f
EOF

chmod +x update-bot.sh

echo "✅ Deployment complete!"
echo "📋 Next steps:"
echo "1. Add your Discord bot credentials to /opt/9bots2/.env"
echo "2. Restart the service: sudo systemctl restart 9bots-discord"
echo "3. Check logs: docker-compose logs -f"
echo "4. To update manually: ./update-bot.sh"
