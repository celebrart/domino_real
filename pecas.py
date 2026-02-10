import random

class Peca:
    def __init__(self, lado_a, lado_b):
        self.valores = [lado_a, lado_b]
        self.is_buchuda = lado_a == lado_b
        self.peso = lado_a + lado_b
        self.rect = None # Para detectar cliques na tela

    def __repr__(self):
        return f"[{self.valores[0]}|{self.valores[1]}]"

def gerar_deck():
    return [Peca(i, j) for i in range(7) for j in range(i, 7)]
