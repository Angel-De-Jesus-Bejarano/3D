const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const textureLoader = new THREE.TextureLoader();
const textura = textureLoader.load('textura.jpg');
const textura2 = textureLoader.load('textura2.jpg');

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ map : textura});
const cube = new THREE.Mesh(geometry, material);

scene.add(cube);

camera.position.z = 5;

const automatico = document.getElementById('btn1');
const manual = document.getElementById('btn2');
const cambio = document.getElementById('btnC');
var cambioValue = document.getElementById('input-value');
let flag = true;

automatico.addEventListener("click", function animate(){
    requestAnimationFrame(animate);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
})

manual.addEventListener("click", function onkeydown(e){
    document.addEventListener("keydown", onkeydown);
    requestAnimationFrame(onkeydown);
    switch(e.keyCode){
        case 37 : 
            cube.position.x -= 1;
            break;
        case 38 :
            cube.position.y += 1;
            break;
        case 39 :
            cube.position.x += 1;
            break;
        case 40 :
            cube.position.y -= 1;
            break;
        case 97 :
            cube.position.z += 0.5;
            break;
        case 98 :
            cube.position.z -= 0.5;
            break;
        case 100 :
            cube.rotation.y += 0.2;
            break;
        case 101 :
            cube.rotation.y -= 0.2;
            break;
    }
    renderer.render(scene, camera);
});


updateTexture();
cambioValue.innerHTML = cambio.value;

cambio.addEventListener("change", () => {
    updateTexture();
    updateTexture();
    cambioValue.innerHTML = cambio.value;
  });
  
  function updateTexture() {
    if (cambio.value < 0) {
        if (flag) {
            cube.material.map = textura2;
            flag = false; // Cambia el interruptor (flag) a falso
        }
    } else {
        if (!flag) {
            cube.material.map = textura;
            flag = true; // Cambia el interruptor (flag) a verdadero
        }
    }
}
  

