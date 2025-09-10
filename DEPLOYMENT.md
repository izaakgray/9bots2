# Discord Bot Deployment Guide for DigitalOcean

This guide will help you deploy your Discord bot to DigitalOcean with automatic updates when you push new code.

## 🚀 Quick Setup

### 1. Create DigitalOcean Droplet

1. Go to [DigitalOcean](https://cloud.digitalocean.com/)
2. Create a new droplet:
   - **Image**: Ubuntu 22.04 LTS
   - **Size**: Basic $6/month (1GB RAM) is sufficient
   - **Authentication**: SSH Key (recommended)
   - **Hostname**: `discord-bot-server`

### 2. Initial Server Setup

```bash
# Connect to your server
ssh root@YOUR_SERVER_IP

# Create a non-root user
adduser discord
usermod -aG sudo discord
su - discord
```

### 3. Deploy the Bot

```bash
# Download and run the deployment script
curl -fsSL https://raw.githubusercontent.com/IzaakGrayAg3ncy/9bots2/main/scripts/deploy.sh | bash
```

### 4. Configure Environment Variables

```bash
# Edit the environment file
nano /opt/9bots2/.env
```

Add your Discord bot credentials:
```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_application_client_id_here
```

### 5. Start the Bot

```bash
# Restart the service to load new environment
sudo systemctl restart 9bots-discord

# Check if it's running
sudo systemctl status 9bots-discord

# View logs
cd /opt/9bots2
docker-compose logs -f
```

## 🔄 Automatic Updates Setup

### Option 1: GitHub Actions (Recommended)

1. **Add GitHub Secrets**:
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - Add these secrets:
     - `DO_HOST`: Your DigitalOcean server IP
     - `DO_USERNAME`: `discord` (or your username)
     - `DO_SSH_KEY`: Your private SSH key

2. **Push to trigger deployment**:
   ```bash
   git add .
   git commit -m "Deploy bot"
   git push origin main
   ```

### Option 2: Manual Updates

```bash
# SSH into your server
ssh discord@YOUR_SERVER_IP

# Run the update script
cd /opt/9bots2
./update-bot.sh
```

## 🛠️ Management Commands

### Service Management
```bash
# Start bot
sudo systemctl start 9bots-discord

# Stop bot
sudo systemctl stop 9bots-discord

# Restart bot
sudo systemctl restart 9bots-discord

# Check status
sudo systemctl status 9bots-discord

# Enable auto-start on boot
sudo systemctl enable 9bots-discord
```

### Docker Management
```bash
# View logs
docker-compose logs -f

# View running containers
docker-compose ps

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Clean up unused images
docker system prune -f
```

### Log Management
```bash
# View recent logs
tail -f /opt/9bots2/logs/*.log

# View systemd logs
journalctl -u 9bots-discord -f
```

## 🔧 Troubleshooting

### Bot Not Starting
1. Check environment variables:
   ```bash
   cat /opt/9bots2/.env
   ```

2. Check Docker logs:
   ```bash
   docker-compose logs
   ```

3. Check systemd logs:
   ```bash
   journalctl -u 9bots-discord -n 50
   ```

### Bot Not Responding
1. Verify Discord token is correct
2. Check if bot is online in Discord
3. Verify bot has proper permissions in your server

### Update Issues
1. Check if GitHub Actions are running
2. Verify SSH key permissions
3. Check server disk space: `df -h`

## 📊 Monitoring

### Health Checks
The bot includes health checks that you can monitor:

```bash
# Check container health
docker ps

# Check if bot is responding
curl http://localhost:3000/health  # if you add a health endpoint
```

### Log Rotation
Logs are automatically rotated daily and kept for 7 days.

## 🔒 Security Best Practices

1. **Use SSH keys** instead of passwords
2. **Keep system updated**: `sudo apt update && sudo apt upgrade`
3. **Use non-root user** for running the bot
4. **Regular backups** of your data directory
5. **Monitor logs** for any suspicious activity

## 📁 File Structure

```
/opt/9bots2/
├── .env                 # Environment variables
├── docker-compose.yml   # Docker configuration
├── Dockerfile          # Container definition
├── data/               # Bot data (persistent)
├── logs/               # Application logs
├── scripts/
│   └── deploy.sh       # Initial deployment script
└── update-bot.sh       # Manual update script
```

## 🆘 Support

If you encounter issues:

1. Check the logs first
2. Verify your Discord bot configuration
3. Ensure all environment variables are set
4. Check server resources (RAM, disk space)

## 🔄 Backup Strategy

```bash
# Backup data directory
tar -czf backup-$(date +%Y%m%d).tar.gz /opt/9bots2/data

# Restore from backup
tar -xzf backup-YYYYMMDD.tar.gz -C /
```

This setup provides a robust, auto-updating Discord bot deployment on DigitalOcean! 🎉
