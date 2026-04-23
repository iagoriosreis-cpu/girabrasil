/* =============================================
   GIRABRASIL — REGIOES-DATA.JS
   Dados de cada região do Brasil
   ============================================= */

const REGIOES_DATA = {
  norte: {
    nome: "Norte",
    titulo: "Região Norte",
    descricao: "A maior região do Brasil, dominada pela Floresta Amazônica — o maior bioma tropical do planeta. Aqui vive mais de 10% de todas as espécies da Terra, em rios que carregam 20% de toda a água doce superficial do mundo.",
    cor: "#22c55e",
    stats: [
      { val: "3.9M", label: "km² de área" },
      { val: "9", label: "estados" },
      { val: "10%", label: "fauna mundial" }
    ],
    biomas: ["Floresta Amazônica", "Cerrado", "Campos rupestres", "Várzea"],
    fauna: [
      { emoji: "🦜", nome: "Arara-azul" },
      { emoji: "🐊", nome: "Jacaré-açu" },
      { emoji: "🐬", nome: "Boto-cor-de-rosa" },
      { emoji: "🦥", nome: "Preguiça-de-3-dedos" },
      { emoji: "🐆", nome: "Onça-pintada" },
      { emoji: "🦋", nome: "Borboleta-azul" }
    ],
    paginaNoticias: "noticias-norte.html"
  },

  nordeste: {
    nome: "Nordeste",
    titulo: "Região Nordeste",
    descricao: "Berço cultural do Brasil, o Nordeste abriga biomas únicos como a Caatinga — vegetação exclusivamente brasileira — além de manguezais, Mata Atlântica e restingas litorâneas de rara beleza.",
    cor: "#f59e0b",
    stats: [
      { val: "1.5M", label: "km² de área" },
      { val: "9", label: "estados" },
      { val: "3.8k km", label: "de litoral" }
    ],
    biomas: ["Caatinga", "Mata Atlântica", "Cerrado", "Manguezais", "Restinga"],
    fauna: [
      { emoji: "🦩", nome: "Flamingo" },
      { emoji: "🐢", nome: "Tartaruga-marinha" },
      { emoji: "🦅", nome: "Gavião-carrapateiro" },
      { emoji: "🐟", nome: "Peixe-boi marinho" },
      { emoji: "🦎", nome: "Teiú" },
      { emoji: "🐸", nome: "Sapo-boi" }
    ],
    paginaNoticias: "noticias-nordeste.html"
  },

  "centro-oeste": {
    nome: "Centro-Oeste",
    titulo: "Centro-Oeste",
    descricao: "Coração do Brasil e celeiro da biodiversidade, o Centro-Oeste abriga o maior bioma savânico do Hemisfério Sul — o Cerrado — e o Pantanal, considerado a maior planície inundável do mundo.",
    cor: "#10b981",
    stats: [
      { val: "1.6M", label: "km² de área" },
      { val: "4", label: "estados/DF" },
      { val: "200k", label: "espécies vegetais" }
    ],
    biomas: ["Cerrado", "Pantanal", "Floresta Amazônica", "Mata Ciliar"],
    fauna: [
      { emoji: "🐆", nome: "Onça-pintada" },
      { emoji: "🦦", nome: "Lontra-gigante" },
      { emoji: "🦙", nome: "Tamanduá-bandeira" },
      { emoji: "🐦", nome: "Tuiuiú" },
      { emoji: "🐊", nome: "Jacaré-do-pantanal" },
      { emoji: "🦌", nome: "Cervo-do-pantanal" }
    ],
    paginaNoticias: "noticias-centro-oeste.html"
  },

  sudeste: {
    nome: "Sudeste",
    titulo: "Região Sudeste",
    descricao: "A região mais populosa e industrializada do Brasil guarda fragmentos preciosos da Mata Atlântica, um dos biomas mais ameaçados e biodiversos do planeta, com apenas 12% de sua cobertura original.",
    cor: "#6366f1",
    stats: [
      { val: "924k", label: "km² de área" },
      { val: "4", label: "estados" },
      { val: "12%", label: "Mata Atlântica restante" }
    ],
    biomas: ["Mata Atlântica", "Cerrado", "Mangue", "Restinga", "Campos de altitude"],
    fauna: [
      { emoji: "🦁", nome: "Mico-leão-dourado" },
      { emoji: "🦜", nome: "Papagaio-de-peito-roxo" },
      { emoji: "🦋", nome: "Borboleta-espelho" },
      { emoji: "🐸", nome: "Perereca-verde" },
      { emoji: "🦦", nome: "Lontra" },
      { emoji: "🦅", nome: "Harpia" }
    ],
    paginaNoticias: "noticias-sudeste.html"
  },

  sul: {
    nome: "Sul",
    titulo: "Região Sul",
    descricao: "A menor região em extensão mas rica em diversidade, o Sul abriga a Mata Atlântica com Araucárias, campos gaúchos, costões rochosos e a única floresta de pinheiros nativos do país.",
    cor: "#0ea5e9",
    stats: [
      { val: "576k", label: "km² de área" },
      { val: "3", label: "estados" },
      { val: "1.1k m", label: "altitude máxima" }
    ],
    biomas: ["Mata Atlântica", "Pampa", "Floresta de Araucária", "Campos Sulinos", "Costões Rochosos"],
    fauna: [
      { emoji: "🐧", nome: "Pinguim-de-Magalhães" },
      { emoji: "🦌", nome: "Veado-campeiro" },
      { emoji: "🦅", nome: "Águia-serrana" },
      { emoji: "🐟", nome: "Dourado" },
      { emoji: "🦫", nome: "Capivara" },
      { emoji: "🦜", nome: "Maracanã-nobre" }
    ],
    paginaNoticias: "noticias-sul.html"
  }
};
