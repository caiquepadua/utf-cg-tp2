import * as twgl from "./lib/twgl-full.module.js";

const m4 = twgl.m4;
twgl.setDefaults({ attribPrefix: "a_" });

const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

const texturas = twgl.createTextures(gl, {
  branca: { src: [255, 255, 255, 255] },
  neve: { src: "assets/textures/neve.png" },
  casca: { src: "assets/textures/casca.png" },
  pedra: { src: "assets/textures/pedra.png" },
});

const RAIO_MUNDO = 8;

let luzLigada = true;
window.addEventListener("keydown", (evento) => {
  if (evento.key === "l" || evento.key === "L") {
    luzLigada = !luzLigada;
  }
});

function material(cor, especular, brilho, textura = texturas.branca) {
  return {
    ambiente: cor.map((c) => c * 0.35),
    difusa: cor,
    especular: [especular, especular, especular],
    brilho,
    textura,
  };
}

const materiais = {
  neve: material([1, 1, 1], 0.2, 16, texturas.neve),
  pokebola: material([0.8, 0.12, 0.12], 0.9, 64),
  tronco: material([1, 1, 1], 0.05, 8, texturas.casca),
  copa: material([0.1, 0.4, 0.2], 0.1, 10),
  pedra: material([1, 1, 1], 0.4, 32, texturas.pedra),
  boneco: material([0.95, 0.95, 1], 0.3, 24),
};

async function carregarTexto(url) {
  const resposta = await fetch(url);
  return await resposta.text();
}

async function iniciar() {
  const codigoVertex = await carregarTexto("shaders/cena.vert");
  const codigoFragment = await carregarTexto("shaders/cena.frag");
  const programInfo = twgl.createProgramInfo(gl, [codigoVertex, codigoFragment]);

  const formas = {
    disco: twgl.primitives.createDiscBufferInfo(gl, RAIO_MUNDO, 48),
    hemisferio: twgl.primitives.createSphereBufferInfo(gl, RAIO_MUNDO, 48, 24, Math.PI / 2, Math.PI),
    cilindro: twgl.primitives.createCylinderBufferInfo(gl, 1, 1, 16, 1),
    cone: twgl.primitives.createTruncatedConeBufferInfo(gl, 1, 0, 1, 16, 1),
    esfera: twgl.primitives.createSphereBufferInfo(gl, 1, 24, 16),
  };

  function desenhar(forma, modelo, mat) {
    twgl.setBuffersAndAttributes(gl, programInfo, forma);
    twgl.setUniforms(programInfo, {
      u_modelo: modelo,
      u_modeloInvTransp: m4.transpose(m4.inverse(modelo)),
      u_ambiente: mat.ambiente,
      u_difusa: mat.difusa,
      u_especular: mat.especular,
      u_brilho: mat.brilho,
      u_textura: mat.textura,
    });
    twgl.drawBufferInfo(gl, forma);
  }

  function desenharPinheiro(x, z) {
    let tronco = m4.translation([x, 0.5, z]);
    tronco = m4.scale(tronco, [0.2, 1, 0.2]);
    desenhar(formas.cilindro, tronco, materiais.tronco);

    let copa = m4.translation([x, 2, z]);
    copa = m4.scale(copa, [0.9, 2, 0.9]);
    desenhar(formas.cone, copa, materiais.copa);
  }

  function desenharPedra(x, z, tamanho) {
    let modelo = m4.translation([x, tamanho * 0.4, z]);
    modelo = m4.scale(modelo, [tamanho, tamanho * 0.7, tamanho]);
    desenhar(formas.esfera, modelo, materiais.pedra);
  }

  function desenharBoneco(x, z) {
    const partes = [[0.8, 0.8], [0.58, 2.03], [0.4, 2.9]];
    for (const [raio, altura] of partes) {
      let modelo = m4.translation([x, altura, z]);
      modelo = m4.scale(modelo, [raio, raio, raio]);
      desenhar(formas.esfera, modelo, materiais.boneco);
    }
  }

  gl.enable(gl.DEPTH_TEST);

  const posicaoCamera = [12, 10, 16];

  function loop() {
    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.1, 0.1, 0.15, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const aspecto = gl.canvas.width / gl.canvas.height;
    const projecao = m4.perspective(Math.PI / 4, aspecto, 0.1, 100);
    const camera = m4.lookAt(posicaoCamera, [0, 0, 0], [0, 1, 0]);
    const viewProjecao = m4.multiply(projecao, m4.inverse(camera));

    gl.useProgram(programInfo.program);
    twgl.setUniforms(programInfo, {
      u_viewProjecao: viewProjecao,
      u_posicaoCamera: posicaoCamera,
      u_direcaoParaLuz: [0.5, 1, 0.6],
      u_corLuz: [1, 0.97, 0.9],
      u_luzAmbiente: [0.55, 0.6, 0.75],
      u_luzLigada: luzLigada,
    });

    desenhar(formas.disco, m4.identity(), materiais.neve);
    desenhar(formas.hemisferio, m4.identity(), materiais.pokebola);

    desenharPinheiro(-4, -2);
    desenharPinheiro(3, -4);
    desenharPinheiro(-2, 4);
    desenharPedra(4, 2, 0.7);
    desenharPedra(-5, 1, 0.5);
    desenharBoneco(1, -5);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

iniciar();