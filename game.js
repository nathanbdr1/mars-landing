// Main game initialization
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Game setup
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            throw new Error('Canvas element not found');
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get 2d context');
        }
        
        const gameOverDiv = document.getElementById('game-over');
        const messageDiv = document.getElementById('message');
        const fuelDiv = document.getElementById('fuel');
        const thrustButton = document.getElementById('thrust-button');
        const restartButton = document.getElementById('restart-button');

        // Resize canvas to fit screen while maintaining aspect ratio
        function resizeCanvas() {
            const container = document.getElementById('game-container');
            const containerWidth = container.clientWidth;
            const containerHeight = window.innerHeight * 0.9;
            
            const originalRatio = 800 / 1200;
            const containerRatio = containerWidth / containerHeight;
            
            let newWidth, newHeight;
            
            if (containerRatio > originalRatio) {
                // Container is wider than the original ratio
                newHeight = containerHeight;
                newWidth = containerHeight * originalRatio;
            } else {
                // Container is taller than the original ratio
                newWidth = containerWidth;
                newHeight = containerWidth / originalRatio;
            }
            
            canvas.style.width = `${newWidth}px`;
            canvas.style.height = `${newHeight}px`;
        }
        
        // Resize on load and window resize
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Constants
        const GRAVITY = 0.05;
        let THRUST_POWER = 0.15;
        const HORIZONTAL_SPEED = 3.0;
        const MAX_LANDING_SPEED = 4.0;
        const FUEL_CONSUMPTION_RATE = 0.25;
        const ALIEN_SPAWN_RATE = 0.01;
        const ALIEN_SPEED = 2.0;
        const ALIEN_FIRE_RATE = 0.005;
        const ALIEN_KILL_REWARD = 100;
        const DEFAULT_SHOOT_COOLDOWN = 15;

        // Global game state
        let store = null;
        let money = 0;
        let gameOver = false;
        let success = false;
        let showDelayedGameOver = false;
        let gameOverDelay = 0;
        let aliens = [];
        let projectiles = [];
        let explosions = [];
        let spacecraft = null;
        let landingPads = [];
        let arrow = null;

        // Function to restart the game
        function restartGame() {
            console.log('Restarting game...');
            spacecraft = new Spacecraft();
            gameOver = false;
            success = false;
            explosions = [];
            aliens = [];
            projectiles = [];
            showDelayedGameOver = false;
            gameOverDelay = 0;
            if (gameOverDiv) {
                gameOverDiv.style.display = 'none';
            }
            if (store) {
                store.isOpen = false;
                if (fuelDiv) {
                    fuelDiv.textContent = `Fuel: ${Math.floor(spacecraft.fuel)}`;
                }
            }
            // Don't reset money or upgrades between attempts
            console.log('Game restarted');
        }

        // Store class for upgrades
        class Store {
            constructor() {
                console.log('Creating new store instance');
                try {
                    this.isOpen = false;
                    this.upgrades = {
                        fuelCapacity: {
                            name: "Fuel Capacity",
                            cost: 200,
                            level: 1,
                            maxLevel: 5,
                            getValue: (level) => 300 + (level - 1) * 100,
                            description: "Increase fuel tank capacity"
                        },
                        thrustPower: {
                            name: "Engine Power",
                            cost: 300,
                            level: 1,
                            maxLevel: 3,
                            getValue: (level) => 0.15 + (level - 1) * 0.05,
                            description: "Increase engine thrust power"
                        },
                        fireRate: {
                            name: "Fire Rate",
                            cost: 250,
                            level: 1,
                            maxLevel: 3,
                            getValue: (level) => DEFAULT_SHOOT_COOLDOWN - (level - 1) * 3,
                            description: "Decrease time between shots"
                        }
                    };
                    console.log('Store upgrades initialized:', this.upgrades);
                } catch (error) {
                    console.error('Error initializing store:', error);
                    throw error;
                }
            }

            draw() {
                if (!this.isOpen) return;

                // Semi-transparent background
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Store title
                ctx.fillStyle = 'white';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('UPGRADE STORE', canvas.width/2, 50);
                ctx.fillText(`Money: $${money}`, canvas.width/2, 80);

                // Draw upgrade options
                ctx.font = '18px Arial';
                let y = 120;
                Object.entries(this.upgrades).forEach(([key, upgrade]) => {
                    const canAfford = money >= upgrade.cost;
                    const maxedOut = upgrade.level >= upgrade.maxLevel;
                    
                    // Background for upgrade item
                    ctx.fillStyle = 'rgba(50, 50, 50, 0.5)';
                    ctx.fillRect(canvas.width/4, y, canvas.width/2, 80);
                    
                    // Upgrade name and level
                    ctx.fillStyle = maxedOut ? '#FFD700' : (canAfford ? 'white' : '#666');
                    ctx.textAlign = 'left';
                    ctx.fillText(`${upgrade.name} (Level ${upgrade.level}/${upgrade.maxLevel})`, canvas.width/4 + 10, y + 25);
                    
                    // Description and cost
                    ctx.font = '14px Arial';
                    ctx.fillText(upgrade.description, canvas.width/4 + 10, y + 45);
                    ctx.fillText(maxedOut ? 'MAXED OUT' : `Cost: $${upgrade.cost}`, canvas.width/4 + 10, y + 65);
                    
                    y += 100;
                });

                // Instructions
                ctx.font = '16px Arial';
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.fillText('Press 1-3 to purchase upgrades, ESC to close', canvas.width/2, canvas.height - 30);
            }

            buyUpgrade(index) {
                if (!this.isOpen) return;
                
                const upgrades = Object.values(this.upgrades);
                if (index >= 0 && index < upgrades.length) {
                    const upgrade = upgrades[index];
                    if (money >= upgrade.cost && upgrade.level < upgrade.maxLevel) {
                        money -= upgrade.cost;
                        upgrade.level++;
                        upgrade.cost = Math.floor(upgrade.cost * 1.5); // Increase cost for next level
                        
                        // Apply upgrade effects
                        switch(index) {
                            case 0: // Fuel Capacity
                                spacecraft.fuel = upgrade.getValue(upgrade.level);
                                if (fuelDiv) {
                                    fuelDiv.textContent = `Fuel: ${Math.floor(spacecraft.fuel)}`;
                                }
                                break;
                            case 1: // Thrust Power
                                THRUST_POWER = upgrade.getValue(upgrade.level);
                                break;
                            case 2: // Fire Rate
                                spacecraft.shootCooldown = upgrade.getValue(upgrade.level);
                                break;
                        }
                        
                        // Force a redraw of the store to show updated values
                        this.draw();
                    }
                }
            }
        }

        // Initialize game objects and event listeners
        function initializeGame() {
            console.log('Initializing game...');
            
            // Initialize store first
            store = new Store();
            console.log('Store initialized:', store);
            
            // Then initialize spacecraft with store values
            spacecraft = new Spacecraft();
            arrow = new Arrow();
            landingPads = [
                new LandingPad(200, worldHeight - 60),
                new LandingPad(worldWidth - 200, worldHeight - 60)
            ];

            // Keyboard event listeners
            document.addEventListener('keydown', (event) => {
                if (event.code === 'Space') {
                    spacecraft.engineOn = true;
                }
                if (event.code === 'KeyR' && gameOver) {
                    restartGame();
                }
                if (event.code === 'ArrowLeft') {
                    spacecraft.movingLeft = true;
                    spacecraft.movingRight = false;
                }
                if (event.code === 'ArrowRight') {
                    spacecraft.movingRight = true;
                    spacecraft.movingLeft = false;
                }
                if (event.code === 'KeyZ' || event.code === 'KeyX' || event.code === 'KeyC') {
                    spacecraft.shooting = true;
                }
                
                // Store controls
                if (event.code === 'KeyP') {
                    console.log('P key pressed');
                    if (store) {
                        store.isOpen = !store.isOpen;
                        console.log('Store is now:', store.isOpen ? 'open' : 'closed');
                    } else {
                        console.error('Store not initialized!');
                    }
                }
                
                if (store && store.isOpen) {
                    if (event.code === 'Escape') {
                        store.isOpen = false;
                    } else if (event.code === 'Digit1') {
                        store.buyUpgrade(0);
                    } else if (event.code === 'Digit2') {
                        store.buyUpgrade(1);
                    } else if (event.code === 'Digit3') {
                        store.buyUpgrade(2);
                    }
                }
            });

            document.addEventListener('keyup', (event) => {
                if (event.code === 'Space') {
                    spacecraft.engineOn = false;
                }
                if (event.code === 'ArrowLeft') {
                    spacecraft.movingLeft = false;
                }
                if (event.code === 'ArrowRight') {
                    spacecraft.movingRight = false;
                }
                if (event.code === 'KeyZ' || event.code === 'KeyX' || event.code === 'KeyC') {
                    spacecraft.shooting = false;
                }
            });

            // Touch controls
            if (thrustButton) {
                thrustButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    spacecraft.engineOn = true;
                });
                
                thrustButton.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    spacecraft.engineOn = false;
                });
                
                thrustButton.addEventListener('mousedown', () => {
                    spacecraft.engineOn = true;
                });
                
                thrustButton.addEventListener('mouseup', () => {
                    spacecraft.engineOn = false;
                });
            }

            // Touch controls for movement
            canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const rect = canvas.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                
                if (x < rect.width / 3) {
                    spacecraft.movingLeft = true;
                    spacecraft.movingRight = false;
                } else if (x > rect.width * 2 / 3) {
                    spacecraft.movingRight = true;
                    spacecraft.movingLeft = false;
                }
            });
            
            canvas.addEventListener('touchend', (e) => {
                e.preventDefault();
                spacecraft.movingLeft = false;
                spacecraft.movingRight = false;
            });
            
            // Restart button
            if (restartButton) {
                restartButton.addEventListener('click', restartGame);
                restartButton.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    restartGame();
                });
            }

            console.log('Game initialization complete');
        }

        // Camera class to follow the spacecraft
        class Camera {
            constructor() {
                this.x = 0;
                this.y = 0;
                this.width = canvas.width;
                this.height = canvas.height;
                this.followSpeed = 0.05; // Smooth follow speed (0-1)
            }
            
            follow(target) {
                // Calculate the target center position
                const targetCenterX = canvas.width / 2;
                const targetCenterY = canvas.height / 2;
                
                // Smoothly move camera towards the target
                const targetX = target.x - targetCenterX;
                const targetY = target.y - targetCenterY;
                
                // Smooth follow with easing
                this.x += (targetX - this.x) * this.followSpeed;
                this.y += (targetY - this.y) * this.followSpeed;
                
                // Limit camera movement to keep Mars surface in view
                if (this.y > canvas.height * 0.4) {
                    this.y = canvas.height * 0.4;
                }
                
                // Don't go too high
                if (this.y < -canvas.height * 0.1) {
                    this.y = -canvas.height * 0.1;
                }
            }
            
            // Apply camera transformation to context
            begin() {
                ctx.save();
                ctx.translate(-this.x, -this.y);
            }
            
            // Restore context
            end() {
                ctx.restore();
            }
            
            // Convert screen coordinates to world coordinates
            screenToWorld(screenX, screenY) {
                return {
                    x: screenX + this.x,
                    y: screenY + this.y
                };
            }
            
            // Convert world coordinates to screen coordinates
            worldToScreen(worldX, worldY) {
                return {
                    x: worldX - this.x,
                    y: worldY - this.y
                };
            }
        }
        
        // Explosion class
        class Particle {
            constructor(x, y, color) {
                this.x = x;
                this.y = y;
                this.size = Math.random() * 5 + 2;
                this.speedX = Math.random() * 6 - 3;
                this.speedY = Math.random() * 6 - 3;
                this.color = color;
                this.life = 1.0;  // Life from 1.0 to 0.0
                this.decay = Math.random() * 0.03 + 0.02;  // Rate of life decrease
            }
            
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                this.speedY += 0.05;  // Gravity effect
                this.life -= this.decay;
                this.size -= 0.05;
                if (this.size < 0) this.size = 0;
            }
            
            draw() {
                ctx.globalAlpha = this.life;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }
        
        class Explosion {
            constructor(x, y) {
                this.particles = [];
                this.x = x;
                this.y = y;
                this.active = true;
                
                // Particle colors
                const colors = ['#FF5500', '#FF0000', '#FFFF00', '#FF9500', '#FFFFFF'];
                
                // Create particles
                for (let i = 0; i < 50; i++) {
                    this.particles.push(new Particle(x, y, colors[Math.floor(Math.random() * colors.length)]));
                }
                
                // Create a shockwave
                this.shockwaveRadius = 0;
                this.shockwaveMaxRadius = 60;
                this.shockwaveAlpha = 1.0;
            }
            
            update() {
                let allDead = true;
                
                for (let p of this.particles) {
                    p.update();
                    if (p.life > 0) {
                        allDead = false;
                    }
                }
                
                // Update shockwave
                if (this.shockwaveRadius < this.shockwaveMaxRadius) {
                    this.shockwaveRadius += 2;
                    this.shockwaveAlpha = 1 - (this.shockwaveRadius / this.shockwaveMaxRadius);
                }
                
                this.active = !allDead || this.shockwaveRadius < this.shockwaveMaxRadius;
            }
            
            draw() {
                // Draw shockwave
                if (this.shockwaveRadius < this.shockwaveMaxRadius) {
                    ctx.globalAlpha = this.shockwaveAlpha;
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.shockwaveRadius, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.globalAlpha = 1.0;
                }
                
                // Draw particles
                for (let p of this.particles) {
                    if (p.life > 0) {
                        p.draw();
                    }
                }
            }
        }

        // Add Alien class after the Explosion class
        class Alien {
            constructor(x, y) {
                this.width = 60;
                this.height = 30;
                this.x = x || Math.random() * worldWidth;
                this.y = y || Math.random() * (worldHeight * 0.6);
                this.velocityX = (Math.random() - 0.5) * ALIEN_SPEED * 2;
                this.velocityY = (Math.random() - 0.5) * ALIEN_SPEED;
                this.health = 1;
                this.fireTimer = 0;
            }
            
            update() {
                // Move alien
                this.x += this.velocityX;
                this.y += this.velocityY;
                
                // Bounce off world boundaries
                if (this.x < this.width || this.x > worldWidth - this.width) {
                    this.velocityX *= -1;
                }
                
                if (this.y < this.height || this.y > worldHeight * 0.7) {
                    this.velocityY *= -1;
                }
                
                // Randomly change direction occasionally
                if (Math.random() < 0.01) {
                    this.velocityX = (Math.random() - 0.5) * ALIEN_SPEED * 2;
                    this.velocityY = (Math.random() - 0.5) * ALIEN_SPEED;
                }
                
                // Try to fire at spacecraft
                if (Math.random() < ALIEN_FIRE_RATE && !gameOver) {
                    // Calculate direction to spacecraft
                    const dx = spacecraft.x - this.x;
                    const dy = spacecraft.y - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    // Only fire if within reasonable range and spacecraft visible
                    if (dist < 500 && spacecraft.visible) {
                        // Normalize direction
                        const dirX = dx / dist;
                        const dirY = dy / dist;
                        
                        // Create projectile
                        projectiles.push(new Projectile(
                            this.x, 
                            this.y,
                            dirX * 5, // Projectile speed in direction of spacecraft
                            dirY * 5,
                            false // Not from player
                        ));
                    }
                }
                
                // Check collision with player projectiles
                for (let i = projectiles.length - 1; i >= 0; i--) {
                    const p = projectiles[i];
                    if (p.fromPlayer && this.checkCollision(p)) {
                        this.health -= 1;
                        projectiles.splice(i, 1);
                        
                        // If health depleted, destroy alien and give reward
                        if (this.health <= 0) {
                            money += ALIEN_KILL_REWARD;
                            createExplosion(this.x, this.y);
                            return false;
                        }
                    }
                }
                
                return true; // Keep alien alive
            }
            
            checkCollision(projectile) {
                return (
                    projectile.x > this.x - this.width/2 &&
                    projectile.x < this.x + this.width/2 &&
                    projectile.y > this.y - this.height/2 &&
                    projectile.y < this.y + this.height/2
                );
            }
            
            draw() {
                // Draw alien ship
                ctx.fillStyle = '#FF00FF';
                
                // Draw UFO body
                ctx.beginPath();
                ctx.ellipse(this.x, this.y, this.width/2, this.height/2, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw cockpit
                ctx.fillStyle = '#00FFFF';
                ctx.beginPath();
                ctx.ellipse(this.x, this.y, this.width/4, this.height/4, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Add Projectile class
        class Projectile {
            constructor(x, y, vx, vy, fromPlayer) {
                this.x = x;
                this.y = y;
                this.velocityX = vx;
                this.velocityY = vy;
                this.fromPlayer = fromPlayer;
                this.radius = fromPlayer ? 3 : 5; // Player projectiles smaller
                this.color = fromPlayer ? '#00FF00' : '#FF0000'; // Green for player, red for aliens
            }
            
            update() {
                this.x += this.velocityX;
                this.y += this.velocityY;
                
                // Check if out of bounds
                if (
                    this.x < 0 || 
                    this.x > worldWidth || 
                    this.y < 0 || 
                    this.y > worldHeight
                ) {
                    return false; // Mark for removal
                }
                
                // Check collision with spacecraft (only for alien projectiles)
                if (!this.fromPlayer && spacecraft.visible && !gameOver) {
                    if (
                        this.x > spacecraft.x - spacecraft.width/2 &&
                        this.x < spacecraft.x + spacecraft.width/2 &&
                        this.y > spacecraft.y - spacecraft.height/2 &&
                        this.y < spacecraft.y + spacecraft.height/2
                    ) {
                        // Spacecraft hit!
                        createExplosion(spacecraft.x, spacecraft.y);
                        spacecraft.visible = false;
                        gameOver = true;
                        success = false;
                        showDelayedGameOver = true;
                        messageDiv.textContent = 'Game Over! Destroyed by aliens!';
                        return false;
                    }
                }
                
                return true; // Keep projectile
            }
            
            draw() {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        class Spacecraft {
            constructor() {
                this.width = 40;
                this.height = 60;
                this.x = canvas.width / 2;
                this.y = 400;
                this.velocityY = 0;
                this.velocityX = 0;
                this.fuel = store ? store.upgrades.fuelCapacity.getValue(store.upgrades.fuelCapacity.level) : 300;
                this.engineOn = false;
                this.movingLeft = false;
                this.movingRight = false;
                this.visible = true;
                this.shooting = false;
                this.shootCooldown = store ? store.upgrades.fireRate.getValue(store.upgrades.fireRate.level) : DEFAULT_SHOOT_COOLDOWN;
                this.money = 0;
            }

            update() {
                // Apply gravity
                this.velocityY += GRAVITY;
                
                // Apply thrust if engine is on and there's fuel
                if (this.engineOn && this.fuel > 0) {
                    this.velocityY -= THRUST_POWER;
                    this.fuel -= FUEL_CONSUMPTION_RATE;
                    fuelDiv.textContent = `Fuel: ${Math.floor(this.fuel)}`;
                }

                // Apply horizontal movement if buttons are pressed
                if (this.movingLeft) {
                    this.velocityX = -HORIZONTAL_SPEED;
                } else if (this.movingRight) {
                    this.velocityX = HORIZONTAL_SPEED;
                } else {
                    // Apply friction/drag to slow down horizontal movement
                    this.velocityX *= 0.95;
                    if (Math.abs(this.velocityX) < 0.1) this.velocityX = 0;
                }

                // Update position
                this.y += this.velocityY;
                this.x += this.velocityX;
                
                // Keep spacecraft within world bounds
                if (this.x < this.width/2) {
                    this.x = this.width/2;
                    this.velocityX = 0;
                }
                if (this.x > worldWidth - this.width/2) {
                    this.x = worldWidth - this.width/2;
                    this.velocityX = 0;
                }

                // Handle shooting cooldown
                if (this.shootCooldown > 0) {
                    this.shootCooldown--;
                }
                
                // Fire projectile if shooting and not on cooldown
                if (this.shooting && this.shootCooldown === 0 && this.visible) {
                    projectiles.push(new Projectile(
                        this.x, 
                        this.y - this.height/2, 
                        0, // Straight up
                        -8, // Speed
                        true // From player
                    ));
                    this.shootCooldown = store.upgrades.fireRate.getValue(store.upgrades.fireRate.level);
                }
            }

            draw() {
                if (!this.visible) return;
                
                // Draw spacecraft body
                ctx.fillStyle = 'white';
                ctx.fillRect(
                    this.x - this.width/2,
                    this.y - this.height/2,
                    this.width,
                    this.height
                );

                // Draw engine flame if thrusting
                if (this.engineOn && this.fuel > 0) {
                    ctx.fillStyle = 'red';
                    ctx.fillRect(
                        this.x - 5,
                        this.y + this.height/2,
                        10,
                        20
                    );
                }
                
                // Draw side thrusters if moving horizontally
                if (this.movingLeft && this.fuel > 0) {
                    ctx.fillStyle = 'orange';
                    ctx.fillRect(
                        this.x + this.width/2,
                        this.y,
                        10,
                        10
                    );
                }
                if (this.movingRight && this.fuel > 0) {
                    ctx.fillStyle = 'orange';
                    ctx.fillRect(
                        this.x - this.width/2 - 10,
                        this.y,
                        10,
                        10
                    );
                }
            }
        }

        class LandingPad {
            constructor(x, y) {
                this.width = 100;
                this.height = 20;
                this.x = x || worldWidth/2 - this.width/2;
                this.y = y || worldHeight - 100;
                this.isLandingZone = true; // Flag to identify landing zones
            }

            draw() {
                ctx.fillStyle = 'green';
                ctx.fillRect(this.x, this.y, this.width, this.height);
            }

            checkLanding(spacecraft) {
                // Check if spacecraft is above the landing pad
                if (spacecraft.x + spacecraft.width/2 > this.x && 
                    spacecraft.x - spacecraft.width/2 < this.x + this.width) {
                    // Check if spacecraft is at the right height
                    if (spacecraft.y + spacecraft.height/2 >= this.y && 
                        spacecraft.y + spacecraft.height/2 <= this.y + 10) {
                        return true;
                    }
                }
                return false;
            }

            getDistanceToSpacecraft(spacecraft) {
                const dx = this.x + this.width/2 - spacecraft.x;
                const dy = this.y - spacecraft.y;
                return Math.sqrt(dx * dx + dy * dy);
            }
        }

        // Add Arrow class
        class Arrow {
            constructor() {
                this.size = 30;
                this.pulseSpeed = 0.05;
                this.pulseOffset = 0;
            }

            update() {
                this.pulseOffset += this.pulseSpeed;
            }

            draw() {
                if (gameOver) return;

                // Find the nearest landing pad
                let nearestPad = landingPads[0];
                let shortestDistance = nearestPad.getDistanceToSpacecraft(spacecraft);

                for (let i = 1; i < landingPads.length; i++) {
                    const distance = landingPads[i].getDistanceToSpacecraft(spacecraft);
                    if (distance < shortestDistance) {
                        shortestDistance = distance;
                        nearestPad = landingPads[i];
                    }
                }

                // Calculate direction to nearest landing pad
                const dx = nearestPad.x + nearestPad.width/2 - spacecraft.x;
                const dy = nearestPad.y - spacecraft.y;
                const angle = Math.atan2(dy, dx);
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Only show arrow if pad is off screen
                if (distance > 300) {
                    // Calculate position on screen edge
                    const screenX = canvas.width / 2;
                    const screenY = canvas.height / 2;
                    const maxDist = Math.min(screenX, screenY) - this.size;
                    
                    // Calculate arrow position
                    const arrowX = screenX + Math.cos(angle) * maxDist;
                    const arrowY = screenY + Math.sin(angle) * maxDist;

                    // Draw pulsing arrow
                    const pulse = Math.sin(this.pulseOffset) * 0.3 + 0.7;
                    ctx.globalAlpha = pulse;
                    
                    // Draw arrow
                    ctx.save();
                    ctx.translate(arrowX, arrowY);
                    ctx.rotate(angle);
                    
                    // Arrow head
                    ctx.beginPath();
                    ctx.moveTo(this.size, 0);
                    ctx.lineTo(-this.size, -this.size/2);
                    ctx.lineTo(-this.size, this.size/2);
                    ctx.closePath();
                    ctx.fillStyle = '#00FF00';
                    ctx.fill();
                    
                    // Arrow shaft
                    ctx.fillStyle = '#00FF00';
                    ctx.fillRect(-this.size, -this.size/4, this.size * 1.5, this.size/2);
                    
                    ctx.restore();
                    ctx.globalAlpha = 1;

                    // Draw distance to pad
                    ctx.fillStyle = '#00FF00';
                    ctx.font = '16px Arial';
                    ctx.fillText(`${Math.floor(distance)} units`, arrowX + 20, arrowY);
                }
            }
        }
        
        // Define world dimensions (larger than canvas)
        const worldWidth = canvas.width * 3;
        const worldHeight = canvas.height;

        // Create camera and game objects
        const camera = new Camera();
        
        // Game loop function
        function gameLoop() {
            update();
            draw();
            requestAnimationFrame(gameLoop);
        }

        // Update function
        function update() {
            // Update all explosions
            for (let i = explosions.length - 1; i >= 0; i--) {
                explosions[i].update();
                if (!explosions[i].active) {
                    explosions.splice(i, 1);
                }
            }
            
            if (showDelayedGameOver) {
                gameOverDelay++;
                if (gameOverDelay > 60) { // About 1 second delay
                    gameOverDiv.style.display = 'block';
                    showDelayedGameOver = false;
                }
                return;
            }
            
            if (!gameOver) {
                spacecraft.update();
                arrow.update();
                
                // Update camera to follow spacecraft
                camera.follow(spacecraft);
                
                // Check for landing on any pad
                for (let pad of landingPads) {
                    if (pad.checkLanding(spacecraft)) {
                        gameOver = true;
                        
                        // Check vertical and horizontal speeds to determine if landing was successful
                        const isSafeVerticalSpeed = Math.abs(spacecraft.velocityY) <= MAX_LANDING_SPEED;
                        const isSafeHorizontalSpeed = Math.abs(spacecraft.velocityX) < 5.0;
                        success = isSafeVerticalSpeed && isSafeHorizontalSpeed;
                        
                        if (!success) {
                            // Explode on crash landing
                            createExplosion(spacecraft.x, spacecraft.y);
                            spacecraft.visible = false;
                            showDelayedGameOver = true;
                            
                            // Determine crash reason for message
                            if (!isSafeVerticalSpeed && !isSafeHorizontalSpeed) {
                                messageDiv.textContent = 'Game Over! Speed too high in both directions!';
                            } else if (!isSafeVerticalSpeed) {
                                messageDiv.textContent = 'Game Over! Vertical speed too high!';
                            } else {
                                messageDiv.textContent = 'Game Over! Horizontal speed too high!';
                            }
                        } else {
                            messageDiv.textContent = 'Success! You landed safely!';
                            gameOverDiv.style.display = 'block';
                        }
                        break;
                    }
                }
                
                // Check for crash with ground
                if (spacecraft.y + spacecraft.height/2 >= worldHeight) {
                    gameOver = true;
                    success = false;
                    
                    // Big explosion on ground crash
                    createExplosion(spacecraft.x, spacecraft.y);
                    spacecraft.visible = false;
                    showDelayedGameOver = true;
                    messageDiv.textContent = 'Game Over! You crashed into the surface!';
                }

                // Update all aliens
                for (let i = aliens.length - 1; i >= 0; i--) {
                    if (!aliens[i].update()) {
                        aliens.splice(i, 1);
                    }
                }
                
                // Update all projectiles
                for (let i = projectiles.length - 1; i >= 0; i--) {
                    if (!projectiles[i].update()) {
                        projectiles.splice(i, 1);
                    }
                }
                
                // Randomly spawn new aliens if there are fewer than 5
                if (aliens.length < 5 && Math.random() < ALIEN_SPAWN_RATE) {
                    // Spawn along top or sides
                    const spawnSide = Math.floor(Math.random() * 3);
                    let x, y;
                    
                    if (spawnSide === 0) { // Top
                        x = Math.random() * worldWidth;
                        y = 50;
                    } else if (spawnSide === 1) { // Left
                        x = 50;
                        y = Math.random() * worldHeight * 0.6;
                    } else { // Right
                        x = worldWidth - 50;
                        y = Math.random() * worldHeight * 0.6;
                    }
                    
                    aliens.push(new Alien(x, y));
                }
            }
        }

        // Draw function
        function draw() {
            // Clear canvas
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Begin camera transformation
            camera.begin();
            
            // Draw stars (fixed background)
            for (let i = 0; i < 200; i++) {
                const x = (Math.random() * worldWidth);
                const y = (Math.random() * worldHeight * 0.8);
                const size = Math.random() > 0.98 ? 2 : 1;
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.fillRect(x, y, size, size);
            }
            
            // Draw Mars surface
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(0, worldHeight - 50, worldWidth, 50);
            
            // Draw game objects
            for (let pad of landingPads) {
                pad.draw();
            }
            
            // Draw all aliens
            for (let alien of aliens) {
                alien.draw();
            }
            
            // Draw all projectiles
            for (let projectile of projectiles) {
                projectile.draw();
            }
            
            spacecraft.draw();
            
            // Draw explosions
            for (let explosion of explosions) {
                explosion.draw();
            }
            
            // End camera transformation
            camera.end();
            
            // Draw arrow (in screen space)
            arrow.draw();
            
            // UI elements (drawn in screen space, not affected by camera)
            if (!gameOver) {
                // Draw velocity indicators
                ctx.fillStyle = 'white';
                ctx.font = '18px Arial';
                ctx.fillText(`Vertical Speed: ${Math.abs(spacecraft.velocityY).toFixed(2)}`, 10, 60);
                ctx.fillText(`Horizontal Speed: ${Math.abs(spacecraft.velocityX).toFixed(2)}`, 10, 90);
            
                // Color-code based on safe landing speeds
                let vSpeedColor;
                if (Math.abs(spacecraft.velocityY) <= MAX_LANDING_SPEED) {
                    vSpeedColor = 'green';
                } else if (Math.abs(spacecraft.velocityY) <= MAX_LANDING_SPEED * 1.5) {
                    vSpeedColor = 'yellow';
                } else {
                    vSpeedColor = 'red';
                }
                
                let hSpeedColor;
                if (Math.abs(spacecraft.velocityX) < 5.0) {
                    hSpeedColor = 'green';
                } else if (Math.abs(spacecraft.velocityX) < 7.5) {
                    hSpeedColor = 'yellow';
                } else {
                    hSpeedColor = 'red';
                }
                
                ctx.fillStyle = vSpeedColor;
                ctx.fillRect(200, 50, Math.min(Math.abs(spacecraft.velocityY) * 10, 100), 10);
                
                ctx.fillStyle = hSpeedColor;
                ctx.fillRect(200, 80, Math.min(Math.abs(spacecraft.velocityX) * 20, 100), 10);
            }

            // Draw control instructions for mobile
            if (!gameOver && window.innerWidth <= 768) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.font = '14px Arial';
                ctx.fillText('← MOVE LEFT', 20, canvas.height - 80);
                ctx.fillText('MOVE RIGHT →', canvas.width - 120, canvas.height - 80);
            }

            // Draw money counter
            ctx.fillStyle = '#FFD700'; // Gold color
            ctx.font = '20px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`Money: $${money}`, 10, 120);

            // Draw store
            store.draw();
        }

        // Helper function to create an explosion
        function createExplosion(x, y) {
            explosions.push(new Explosion(x, y));
            
            // Camera shake effect
            function shake() {
                const intensity = 7;
                const shakeX = Math.random() * intensity - intensity/2;
                const shakeY = Math.random() * intensity - intensity/2;
                canvas.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
            }
            
            // Shake for 500ms
            let shakeCount = 0;
            const maxShakes = 10;
            const shakeInterval = setInterval(() => {
                shake();
                shakeCount++;
                if (shakeCount >= maxShakes) {
                    clearInterval(shakeInterval);
                    canvas.style.transform = 'translate(0, 0)';
                }
            }, 50);
        }

        // Start the game
        console.log('Starting game initialization...');
        initializeGame();
        gameLoop();
        
    } catch (error) {
        console.error('Error initializing game:', error);
        document.body.innerHTML = `<div style="color: white; padding: 20px;">
            <h1>Error initializing game</h1>
            <p>${error.message}</p>
            <p>Please check the console for more details.</p>
        </div>`;
    }
}); 