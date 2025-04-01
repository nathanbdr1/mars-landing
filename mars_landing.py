import pygame
import math
import random

# Initialize Pygame
pygame.init()

# Constants
WINDOW_WIDTH = 800
WINDOW_HEIGHT = 1200
FPS = 60

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BROWN = (139, 69, 19)

# Physics constants
GRAVITY = 0.05
THRUST_POWER = 0.15
MAX_LANDING_SPEED = 4.0

class Spacecraft:
    def __init__(self):
        self.width = 40
        self.height = 60
        self.x = WINDOW_WIDTH // 2
        self.y = 400
        self.velocity_y = 0
        self.fuel = 300
        self.angle = 0
        self.engine_on = False

    def update(self):
        # Apply gravity
        self.velocity_y += GRAVITY
        
        # Apply thrust if engine is on and there's fuel
        if self.engine_on and self.fuel > 0:
            self.velocity_y -= THRUST_POWER
            self.fuel -= 1

        # Update position
        self.y += self.velocity_y

    def draw(self, screen):
        # Draw spacecraft body
        pygame.draw.rect(screen, WHITE, (self.x - self.width//2, self.y - self.height//2, 
                                       self.width, self.height))
        # Draw engine flame if thrusting
        if self.engine_on and self.fuel > 0:
            pygame.draw.rect(screen, RED, (self.x - 5, self.y + self.height//2, 10, 20))

class LandingPad:
    def __init__(self):
        self.width = 100
        self.height = 20
        self.x = WINDOW_WIDTH // 2 - self.width // 2
        self.y = WINDOW_HEIGHT - 250

    def draw(self, screen):
        pygame.draw.rect(screen, GREEN, (self.x, self.y, self.width, self.height))

    def check_landing(self, spacecraft):
        # Check if spacecraft is above the landing pad
        if (spacecraft.x + spacecraft.width//2 > self.x and 
            spacecraft.x - spacecraft.width//2 < self.x + self.width):
            # Check if spacecraft is at the right height
            if (spacecraft.y + spacecraft.height//2 >= self.y and 
                spacecraft.y + spacecraft.height//2 <= self.y + 10):
                return True
        return False

class Game:
    def __init__(self):
        self.screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
        pygame.display.set_caption("Mars Landing")
        self.clock = pygame.time.Clock()
        self.spacecraft = Spacecraft()
        self.landing_pad = LandingPad()
        self.game_over = False
        self.success = False
        self.font = pygame.font.Font(None, 36)

    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE:
                    self.spacecraft.engine_on = True
                if event.key == pygame.K_r and self.game_over:
                    self.restart_game()
            if event.type == pygame.KEYUP:
                if event.key == pygame.K_SPACE:
                    self.spacecraft.engine_on = False
        return True

    def restart_game(self):
        self.spacecraft = Spacecraft()
        self.game_over = False
        self.success = False

    def update(self):
        if not self.game_over:
            self.spacecraft.update()
            
            # Check for landing
            if self.landing_pad.check_landing(self.spacecraft):
                self.game_over = True
                self.success = abs(self.spacecraft.velocity_y) <= MAX_LANDING_SPEED
            
            # Check for crash
            if self.spacecraft.y + self.spacecraft.height//2 >= WINDOW_HEIGHT:
                self.game_over = True
                self.success = False

    def draw(self):
        self.screen.fill(BLACK)
        
        # Draw Mars surface
        pygame.draw.rect(self.screen, BROWN, (0, WINDOW_HEIGHT - 50, WINDOW_WIDTH, 50))
        
        # Draw game objects
        self.landing_pad.draw(self.screen)
        self.spacecraft.draw(self.screen)
        
        # Draw fuel gauge
        fuel_text = self.font.render(f"Fuel: {self.spacecraft.fuel}", True, WHITE)
        self.screen.blit(fuel_text, (10, 10))
        
        # Draw game over message
        if self.game_over:
            message = "Success! You landed safely!" if self.success else "Game Over! You crashed!"
            text = self.font.render(message, True, WHITE)
            text_rect = text.get_rect(center=(WINDOW_WIDTH//2, WINDOW_HEIGHT//2 - 30))
            self.screen.blit(text, text_rect)
            
            # Draw restart message
            restart_text = self.font.render("Press R to Restart", True, WHITE)
            restart_rect = restart_text.get_rect(center=(WINDOW_WIDTH//2, WINDOW_HEIGHT//2 + 30))
            self.screen.blit(restart_text, restart_rect)
        
        pygame.display.flip()

    def run(self):
        running = True
        while running:
            running = self.handle_events()
            self.update()
            self.draw()
            self.clock.tick(FPS)

        pygame.quit()

if __name__ == "__main__":
    game = Game()
    game.run() 