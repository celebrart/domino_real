import pygame
import sys
from pecas import gerar_deck
from ia import IABoteco

# Configurações Iniciais
pygame.init()
LARGURA, ALTURA = 1000, 700
TELA = pygame.display.set_mode((LARGURA, ALTURA))
pygame.display.set_caption("Dominó Real: O Rei da Mesa 🇧🇷")

# Cores e Estilo
VERDE_MESA = (20, 100, 50)
BRANCO = (240, 240, 240)
PRETO = (30, 30, 30)

def desenhar_peca(surface, peca, x, y, ativa=True):
    # Desenha o corpo da peça com sombra para efeito 3D
    cor = BRANCO if ativa else (180, 180, 180)
    rect = pygame.Rect(x, y, 40, 80)
    pygame.draw.rect(surface, (0, 0, 0), (x+2, y+2, 40, 80), border_radius=5) # Sombra
    pygame.draw.rect(surface, cor, rect, border_radius=5)
    pygame.draw.line(surface, PRETO, (x+5, y+40), (x+35, y+40), 2)
    
    # Desenha os pontos (simplificado para exemplo)
    # Aqui entraria a lógica de desenhar os círculos conforme o valor
    fonte = pygame.font.SysFont("Arial", 24, bold=True)
    txt1 = fonte.render(str(peca.valores[0]), True, PRETO)
    txt2 = fonte.render(str(peca.valores[1]), True, PRETO)
    surface.blit(txt1, (x+12, y+5))
    surface.blit(txt2, (x+12, y+45))
    return rect

def loop_principal():
    deck = gerar_deck()
    random.shuffle(deck)
    
    mao_player = deck[:7]
    ia = IABoteco("IA Estrategista", deck[7:14])
    mesa_pontas = []
    
    rodando = True
    while rodando:
        TELA.fill(VERDE_MESA)
        
        # Desenhar mão do jogador
        for i, peca in enumerate(mao_player):
            peca.rect = desenhar_peca(TELA, peca, 100 + (i * 50), 550)

        # Eventos
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                rodando = False
            
            if event.type == pygame.MOUSEBUTTONDOWN:
                for p in mao_player:
                    if p.rect.collidepoint(event.pos):
                        print(f"Você jogou: {p}")
                        # Lógica de validação e turno da IA entrariam aqui

        pygame.display.flip()

if __name__ == "__main__":
    loop_principal()
    pygame.quit()

