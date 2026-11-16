import * as twgl from "./lib/twgl-full.module.js";
import { carregarObj } from "./obj.js";

const m4 = twgl.m4;
twgl.setDefaults({ attribPrefix: "a_" });

const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

const texturas = twgl.createTextures(gl, {
  branca: { src: [255, 255, 255, 255] },
  neve: { src: "assets/textures/neve.png" },
  casca: { src: "assets/textures/casca.png" },
  pedra: { src: "assets/textures/pedra.png" },
  mamoCorpo: { src: "assets/textures/Mammoo_bodyCl_ctr.png", wrap: gl.REPEAT, flipY: 1 },
  mamoOlho:  { src: "assets/textures/Mammoo_eyeCl_ctr.png",  wrap: gl.REPEAT, flipY: 1 },
  mamoBoca:  { src: "assets/textures/Mammoo_mouthCl_ctr.png", wrap: gl.REPEAT, flipY: 1 },
  iglu: { src: "assets/textures/iglu.png", wrap: gl.REPEAT },
});

const RAIO_MUNDO = 10;
const ALVO_CAMERA = [0, 0, 0];

let luzLigada = true;
let cameraAtiva = 1;

const poses = [
  { x: 0,    y: 0,   z: 0,    giroY: 0,            giroZ: 0 },            // inicial: no centro
    { x: 0, y: 0, z: -6.5,    giroY: Math.PI,      giroZ: 0 },            // na borda, olhando pra fora
  { x: 0,    y: 1.8, z: 0,    giroY: 0,            giroZ: Math.PI / 2 },  // deitado de lado, dormindo
];
let poseAtual = 0;

const NOS = [
  [0, 0], [3, 0], [1.5, 2.6], [-1.5, 2.6], [-3, 0], [-1.5, -2.6], [1.5, -2.6],
];
const VIZINHOS = [
  [1, 2, 3, 4, 5, 6], // centro liga em todos
  [0, 2, 6],
  [0, 1, 3],
  [0, 2, 4],
  [0, 3, 5],
  [0, 4, 6],
  [0, 5, 1],
];

const VELOCIDADE = 1;      // unidades por segundo
const VELOCIDADE_GIRO = 2.5;   // radianos por segundo

const passeio = { estado: "idle", espera: 2, no: 0, caminho: [], x: 0, z: 0, giro: 0, fase: 0 };

function reiniciarPasseio() {
  Object.assign(passeio, { estado: "idle", espera: 2, no: 0, caminho: [], x: 0, z: 0, giro: 0, fase: 0 });
}

function sortearCaminho(origem) {
  const passos = 1 + Math.floor(Math.random() * 3);
  const caminho = [];
  let atual = origem;
  let anterior = -1;
  for (let i = 0; i < passos; i++) {
    let opcoes = VIZINHOS[atual].filter((v) => v !== anterior);
    if (opcoes.length === 0) opcoes = VIZINHOS[atual];
    const proximo = opcoes[Math.floor(Math.random() * opcoes.length)];
    caminho.push(proximo);
    anterior = atual;
    atual = proximo;
  }
  return caminho;
}

function diferencaAngulo(alvo, atual) {
  let d = alvo - atual;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

function atualizarPasseio(dt) {
  if (passeio.estado === "idle") {
    passeio.espera -= dt;
    if (passeio.espera <= 0) {
      passeio.caminho = sortearCaminho(passeio.no);
      passeio.estado = "wandering";
    }
    return;
  }

  const alvo = NOS[passeio.caminho[0]];
  const dx = alvo[0] - passeio.x;
  const dz = alvo[1] - passeio.z;
  const distancia = Math.hypot(dx, dz);

  if (distancia < 0.05) {
    passeio.no = passeio.caminho.shift();
    if (passeio.caminho.length === 0) {
      passeio.estado = "idle";
      passeio.espera = 2 + Math.random() * 2;
    }
    return;
  }

  const giroAlvo = Math.atan2(dx, dz);
  const diferenca = diferencaAngulo(giroAlvo, passeio.giro);
  const passoGiro = VELOCIDADE_GIRO * dt;
  passeio.giro += limitar(diferenca, -passoGiro, passoGiro);
  if (Math.abs(diferenca) > 0.3) return; // vira primeiro, depois anda

  const passo = Math.min(VELOCIDADE * dt, distancia);
  passeio.x += (dx / distancia) * passo;
  passeio.z += (dz / distancia) * passo;
  passeio.fase += dt * 8;
}

let neblinaLigada = false;
const DURACAO_DIA = 40; // segundos para um dia completo
let tempoDoDia = 0.2;   // 0 a 1

const cameras = {
  1: { azimute: 0, elevacao: Math.PI / 4, distancia: 26 },
  2: { azimute: 0.8, elevacao: 0.6, distancia: 26 },
};

function limitar(valor, minimo, maximo) {
  return Math.min(Math.max(valor, minimo), maximo);
}

function posicaoDaCamera(cam) {
  const raioHorizontal = cam.distancia * Math.cos(cam.elevacao);
  return [
    ALVO_CAMERA[0] + raioHorizontal * Math.sin(cam.azimute),
    ALVO_CAMERA[1] + cam.distancia * Math.sin(cam.elevacao),
    ALVO_CAMERA[2] + raioHorizontal * Math.cos(cam.azimute),
  ];
}

function misturar(a, b, t) {
  return a.map((v, i) => v + (b[i] - v) * t);
}

window.addEventListener("keydown", (evento) => {
  if (evento.key === "l" || evento.key === "L") luzLigada = !luzLigada;
  if (evento.key === "1") cameraAtiva = 1;
  if (evento.key === "2") cameraAtiva = 2;
  if (evento.key === "p" || evento.key === "P") {
    poseAtual = (poseAtual + 1) % poses.length;
    if (poseAtual === 0) reiniciarPasseio();
  }
  if (evento.key === "n" || evento.key === "N") neblinaLigada = !neblinaLigada;
});

let arrastando = false;
canvas.addEventListener("mousedown", () => {
  arrastando = true;
});
window.addEventListener("mouseup", () => {
  arrastando = false;
});
window.addEventListener("mousemove", (evento) => {
  if (!arrastando || cameraAtiva !== 2) return;
  const cam = cameras[2];
  cam.azimute -= evento.movementX * 0.005;
  cam.elevacao = limitar(cam.elevacao + evento.movementY * 0.005, 0.05, 1.5);
});

canvas.addEventListener(
  "wheel",
  (evento) => {
    evento.preventDefault();
    const cam = cameras[cameraAtiva];
    cam.distancia = limitar(cam.distancia + evento.deltaY * 0.02, 8, 40);
  },
  { passive: false }
);

function material(cor, especular, brilho, textura = texturas.branca, repeticao = [1, 1]) {
  return {
    ambiente: cor.map((c) => c * 0.35),
    difusa: cor,
    especular: [especular, especular, especular],
    brilho,
    textura,
    repeticao,
  };
}

const materiais = {
  neve: material([1, 1, 1], 0.2, 16, texturas.neve),
  pokebola: material([0.8, 0.12, 0.12], 0.9, 64),
  tronco: material([1, 1, 1], 0.05, 8, texturas.casca),
  copa: material([0.1, 0.4, 0.2], 0.1, 10),
  pedra: material([1, 1, 1], 0.4, 32, texturas.pedra),
  boneco: material([0.95, 0.95, 1], 0.3, 24),
  fio: material([0.6, 0.6, 0.65], 0.2, 16),
  gelo: material([0.85, 0.95, 1], 0.7, 64),
  iglu: material([1, 1, 1], 0.5, 40, texturas.iglu, [6, 3]),
  porta: material([0.05, 0.05, 0.08], 0, 1),
};

const materiaisMamo = {
  BodyA: material([1, 1, 1], 0.34, 20, texturas.mamoCorpo),
  BodyB: material([1, 1, 1], 0.34, 20, texturas.mamoCorpo),
  Eye: material([1, 1, 1], 0.34, 20, texturas.mamoOlho),
  Mouth: material([1, 1, 1], 0.34, 20, texturas.mamoBoca),
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
    cubo: twgl.primitives.createCubeBufferInfo(gl, 1),
    cupula: twgl.primitives.createSphereBufferInfo(gl, 1, 32, 16, 0, Math.PI / 2),
    discoPequeno: twgl.primitives.createDiscBufferInfo(gl, 1, 24),
  };

  const dadosMamo = await carregarObj("assets/models/mamoswine.obj"); // confira o nome do arquivo
  const partesMamo = {};
  for (const nome in dadosMamo) {
    partesMamo[nome] = twgl.createBufferInfoFromArrays(gl, dadosMamo[nome]);
    console.log(nome, dadosMamo[nome].position.data.length / 3, "vértices");
  }

  function desenharMamoswine(modelo) {
    for (const nome in partesMamo) {
      desenhar(partesMamo[nome], modelo, materiaisMamo[nome] || materiais.boneco);
    }
  }

  const musica = new Audio("assets/sounds/musica.mp3");
  musica.loop = true;
  musica.volume = 0.3;

  let musicaIniciada = false;
  function iniciarMusica() {
    if (musicaIniciada) return;
    musicaIniciada = true;
    musica.play().catch(() => { musicaIniciada = false; });
  }
  window.addEventListener("keydown", iniciarMusica);
  window.addEventListener("mousedown", iniciarMusica);

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
      u_repeticao: mat.repeticao,
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

  function desenharIglu(x, z, raio) {
    const base = m4.translation([x, 0, z]);

    const cupula = m4.scale(base, [raio, raio * 0.85, raio]);
    desenhar(formas.cupula, cupula, materiais.iglu);

    const anguloPraCentro = Math.atan2(-x, -z);
    const frente = m4.rotateY(base, anguloPraCentro);

    let tunel = m4.translate(frente, [0, 0, raio * 0.9]);
    tunel = m4.rotateX(tunel, Math.PI / 2);
    tunel = m4.scale(tunel, [0.7, 1.2, 0.7]);
    desenhar(formas.cilindro, tunel, materiais.iglu);

    let porta = m4.translate(frente, [0, 0, raio * 0.9 + 0.61]);
    porta = m4.rotateX(porta, Math.PI / 2);
    porta = m4.scale(porta, [0.55, 1, 0.55]);
    desenhar(formas.discoPequeno, porta, materiais.porta);
  }

  function desenharMobile(x, z, tempo) {
    const ALTURA_POSTE = 5;
    const COMPRIMENTO_BRACO = 2.2;
    const COMPRIMENTO_FIO = 0.9;

    const base = m4.translation([x, 0, z]);

    let poste = m4.translate(base, [0, ALTURA_POSTE / 2, 0]);
    poste = m4.scale(poste, [0.12, ALTURA_POSTE, 0.12]);
    desenhar(formas.cilindro, poste, materiais.tronco);

    const topo = m4.translate(base, [0, ALTURA_POSTE, 0]);
    const giratorio = m4.rotateY(topo, tempo * 0.6);

    for (let i = 0; i < 4; i++) {
      const braco = m4.rotateY(giratorio, (i * Math.PI) / 2);

      let barra = m4.translate(braco, [COMPRIMENTO_BRACO / 2, 0, 0]);
      barra = m4.rotateZ(barra, Math.PI / 2);
      barra = m4.scale(barra, [0.06, COMPRIMENTO_BRACO, 0.06]);
      desenhar(formas.cilindro, barra, materiais.tronco);

      const pontaDoBraco = m4.translate(braco, [COMPRIMENTO_BRACO, 0, 0]);

      let fio = m4.translate(pontaDoBraco, [0, -COMPRIMENTO_FIO / 2, 0]);
      fio = m4.scale(fio, [0.015, COMPRIMENTO_FIO, 0.015]);
      desenhar(formas.cilindro, fio, materiais.fio);

      let floco = m4.translate(pontaDoBraco, [0, -COMPRIMENTO_FIO, 0]);
      floco = m4.rotateY(floco, tempo * 1.5 + i);

      for (let j = 0; j < 3; j++) {
        let haste = m4.rotateZ(floco, (j * Math.PI) / 3);
        haste = m4.scale(haste, [0.9, 0.1, 0.08]);
        desenhar(formas.cubo, haste, materiais.gelo);
      }
    }
  }

  gl.enable(gl.DEPTH_TEST);

  let ultimoTempo = performance.now() / 1000;

  function loop(tempoMs) {
    const tempo = tempoMs / 1000;
    const deltaTempo = tempo - ultimoTempo;
    ultimoTempo = tempo;

    cameras[1].azimute += deltaTempo * 0.3;

    tempoDoDia = (tempoDoDia + deltaTempo / DURACAO_DIA) % 1;
    const anguloSol = tempoDoDia * 2 * Math.PI;
    const altura = Math.sin(anguloSol);
    const dia = limitar(altura * 2 + 0.5, 0, 1);

    const direcaoLuz = [Math.cos(anguloSol), Math.max(altura, 0.15), 0.4];
    const corLuz = misturar([0.25, 0.3, 0.55], [1, 0.97, 0.9], dia);
    const luzAmbiente = misturar([0.12, 0.14, 0.25], [0.55, 0.6, 0.75], dia);
    const corCeu = misturar([0.03, 0.04, 0.1], [0.55, 0.75, 0.95], dia);

    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(corCeu[0], corCeu[1], corCeu[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const aspecto = gl.canvas.width / gl.canvas.height;
    const projecao = m4.perspective(Math.PI / 4, aspecto, 0.1, 100);

    const posicaoCamera = posicaoDaCamera(cameras[cameraAtiva]);
    const camera = m4.lookAt(posicaoCamera, ALVO_CAMERA, [0, 1, 0]);
    const viewProjecao = m4.multiply(projecao, m4.inverse(camera));

    gl.useProgram(programInfo.program);
    twgl.setUniforms(programInfo, {
      u_viewProjecao: viewProjecao,
      u_posicaoCamera: posicaoCamera,
      u_direcaoParaLuz: direcaoLuz,
      u_corLuz: corLuz,
      u_luzAmbiente: luzAmbiente,
      u_neblinaLigada: neblinaLigada,
      u_corNeblina: corCeu,
      u_densidadeNeblina: 0.03,
      u_luzLigada: luzLigada,
    });

    desenhar(formas.disco, m4.identity(), materiais.neve);
    desenhar(formas.hemisferio, m4.identity(), materiais.pokebola);
    
    if (poseAtual === 0) {
      atualizarPasseio(Math.min(deltaTempo, 0.1));
      const andando = passeio.estado === "wandering";
      const quique = andando ? Math.abs(Math.sin(passeio.fase)) * 0.15 : 0;
      const ginga = andando ? Math.sin(passeio.fase) * 0.05 : 0;

      let mMamo = m4.translation([passeio.x, quique, passeio.z]);
      mMamo = m4.rotateY(mMamo, passeio.giro);
      mMamo = m4.rotateZ(mMamo, ginga);
      mMamo = m4.scale(mMamo, [1.2, 1.2, 1.2]);
      desenharMamoswine(mMamo);
    } else {
      const p = poses[poseAtual];
      let mMamo = m4.translation([p.x, p.y, p.z]);
      mMamo = m4.rotateY(mMamo, p.giroY);
      mMamo = m4.rotateZ(mMamo, p.giroZ);
      mMamo = m4.scale(mMamo, [1.2, 1.2, 1.2]);
      desenharMamoswine(mMamo);
    }

    desenharPinheiro(5.5, -5.5);
    desenharPinheiro(7.2, -3.2);
    desenharPinheiro(3.8, -7.2);
    desenharPedra(-7.5, 2.5, 0.8);
    desenharPedra(-6.2, 4.5, 0.6);
    desenharPedra(-8, 0.5, 0.5);
    desenharBoneco(2.5, 7);
    desenharMobile(7, 2.5, tempo);
    desenharIglu(-6, -4.5, 1.8);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

iniciar();