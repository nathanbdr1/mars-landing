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
        const THRUST_POWER = 0.15;
        const HORIZONTAL_SPEED = 3.0; // Speed for left/right movement
        const MAX_LANDING_SPEED = 4.0;
        const FUEL_CONSUMPTION_RATE = 0.25;
        
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

        class Spacecraft {
            constructor() {
                this.width = 40;
                this.height = 60;
                this.x = canvas.width / 2;
                this.y = 400;
                this.velocityY = 0;
                this.velocityX = 0; // Added horizontal velocity
                this.fuel = 300;
                this.engineOn = false;
                this.movingLeft = false;
                this.movingRight = false;
                this.visible = true;
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
            constructor() {
                this.width = 100;
                this.height = 20;
                this.x = worldWidth/2 - this.width/2;
                this.y = worldHeight - 250;
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
        }
        
        // Define world dimensions (larger than canvas)
        const worldWidth = canvas.width * 3;
        const worldHeight = canvas.height;

        // Create camera and game objects
        const camera = new Camera();
        let spacecraft = new Spacecraft();
        let landingPad = new LandingPad();
        let gameOver = false;
        let success = false;
        let explosions = [];
        let showDelayedGameOver = false;
        let gameOverDelay = 0;

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
        });

        // Touch controls
        if (thrustButton) {
            // Touch start/end for the thrust button
            thrustButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                spacecraft.engineOn = true;
            });
            
            thrustButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                spacecraft.engineOn = false;
            });
            
            // Mouse events for testing on desktop
            thrustButton.addEventListener('mousedown', () => {
                spacecraft.engineOn = true;
            });
            
            thrustButton.addEventListener('mouseup', () => {
                spacecraft.engineOn = false;
            });
        }
        
        // Add touch controls for left/right movement
        // We'll use simple touch zones on the left and right sides of the screen
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            
            // Touch on left third of screen moves left
            if (x < rect.width / 3) {
                spacecraft.movingLeft = true;
                spacecraft.movingRight = false;
            }
            // Touch on right third of screen moves right
            else if (x > rect.width * 2 / 3) {
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

        function restartGame() {
            spacecraft = new Spacecraft();
            gameOver = false;
            success = false;
            explosions = [];
            showDelayedGameOver = false;
            gameOverDelay = 0;
            gameOverDiv.style.display = 'none';
            fuelDiv.textContent = 'Fuel: 300';
        }

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
                
                // Update camera to follow spacecraft
                camera.follow(spacecraft);
                
                // Check for landing
                if (landingPad.checkLanding(spacecraft)) {
                    gameOver = true;
                    
                    // Check vertical and horizontal speeds to determine if landing was successful
                    const isSafeVerticalSpeed = Math.abs(spacecraft.velocityY) <= MAX_LANDING_SPEED;
                    const isSafeHorizontalSpeed = Math.abs(spacecraft.velocityX) < 5.0;
                    success = isSafeVerticalSpeed && isSafeHorizontalSpeed;
                    
                    console.log("Landing detected!");
                    console.log("Vertical speed:", spacecraft.velocityY, "Max allowed:", MAX_LANDING_SPEED);
                    console.log("Horizontal speed:", spacecraft.velocityX, "Max allowed:", 5.0);
                    console.log("Safe landing:", success);
                    
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
            }
        }

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
            landingPad.draw();
            spacecraft.draw();
            
            // Draw explosions
            for (let explosion of explosions) {
                explosion.draw();
            }
            
            // End camera transformation
            camera.end();
            
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
        }

        function gameLoop() {
            update();
            draw();
            requestAnimationFrame(gameLoop);
        }

        // Start the game
        console.log('Game initialized, starting game loop...');
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