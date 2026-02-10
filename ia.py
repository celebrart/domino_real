class IABoteco:
    def __init__(self, nome, mao):
        self.nome = nome
        self.mao = mao

    def decidir_jogada(self, pontas):
        if not pontas: return self.mao[0] # Começa o jogo
        
        possiveis = [p for p in self.mao if p.valores[0] in pontas or p.valores[1] in pontas]
        if not possiveis: return None
        
        # Estratégia Brasileira: Livrar-se da maior Buchuda primeiro
        possiveis.sort(key=lambda p: (p.is_buchuda, p.peso), reverse=True)
        return possiveis[0]

