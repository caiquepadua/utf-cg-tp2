export async function carregarObj(url) {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error("Não achei o arquivo: " + url);
  const texto = await resposta.text();

  const posicoes = [];
  const texcoords = [];
  const normais = [];

  const grupos = {}; // nome do material -> { position: [], normal: [], texcoord: [] }
  let materialAtual = "default";

  function grupoAtual() {
    if (!grupos[materialAtual]) {
      grupos[materialAtual] = { position: [], normal: [], texcoord: [] };
    }
    return grupos[materialAtual];
  }

  function adicionarVertice(token) {
    const indices = token.split("/"); // "12/34/56" -> ["12", "34", "56"]
    const grupo = grupoAtual();

    grupo.position.push(...posicoes[Number(indices[0]) - 1]);

    if (indices[1]) {
      const t = texcoords[Number(indices[1]) - 1];
      grupo.texcoord.push(t[0], t[1]);
    } else {
      grupo.texcoord.push(0, 0);
    }

    if (indices[2]) {
      grupo.normal.push(...normais[Number(indices[2]) - 1]);
    } else {
      grupo.normal.push(0, 1, 0);
    }
  }

  for (const linha of texto.split("\n")) {
    const partes = linha.trim().split(/\s+/);
    const tipo = partes[0];

    if (tipo === "v") {
      posicoes.push(partes.slice(1, 4).map(Number));
    } else if (tipo === "vt") {
      texcoords.push(partes.slice(1, 3).map(Number));
    } else if (tipo === "vn") {
      normais.push(partes.slice(1, 4).map(Number));
    } else if (tipo === "usemtl") {
      materialAtual = partes[1];
    } else if (tipo === "f") {
      const vertices = partes.slice(1);
      for (let i = 1; i < vertices.length - 1; i++) {
        adicionarVertice(vertices[0]);
        adicionarVertice(vertices[i]);
        adicionarVertice(vertices[i + 1]);
      }
    }
  }

  const resultado = {};
  for (const nome in grupos) {
    const g = grupos[nome];
    resultado[nome] = {
      position: { numComponents: 3, data: g.position },
      normal: { numComponents: 3, data: g.normal },
      texcoord: { numComponents: 2, data: g.texcoord },
    };
  }
  return resultado;
}