// Librerias de ThreeJs
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js"
import { FBXLoader } from "https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js"
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js"

//Proxy(Gestion de Animaciones)
class BasicCharacterControllerProxy {
    constructor(animations) {
        this._animations = animations;
    }

    get animations() {
        return this._animations;
    }
}

// Controladores de personaje
class BasicCharacterController {
    constructor(params) {
        this._params = params;
        this._deceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
        this._aceleration = new THREE.Vector3(1, 0.25, 50.0);
        this._velocity = new THREE.Vector3(0, 0, 0);

        this._animations = {};
        this._input = new BasicCharacterControllerInput();
        this._stateMachine = new CharacterFSM(new BasicCharacterControllerProxy(this._animations));
        this._loadModels();
    }

    _loadModels() {
        const loader = new FBXLoader();
        loader.setPath('./resources/remy/');
        loader.load('Remy.fbx', (fbx) => {
            fbx.scale.setScalar(1);
            fbx.traverse(c => {
                c.castShadown = true;
            });

            this._target = fbx;
            this._params.scene.add(this._target);

            this._mixer = new THREE.AnimationMixer(this._target);
            this._manager = new THREE.LoadingManager();
            this._manager.onLoad = () => {
                this._stateMachine.SetState('idle');
            }

            const _OnLoad = (animName, anim) => {
                const clip = anim.animations[0];
                const action = this._mixer.clipAction(clip);

                this._animations[animName] = {
                    clip: clip,
                    action: action
                }
            }

            const loader = new FBXLoader(this._manager);
            loader.setPath('./resources/remy/');
            loader.load('idle.fbx', (animacion) =>{ _OnLoad('idle', animacion); });
            loader.load('walk.fbx', (animacion) => { _OnLoad('walk', animacion); });
            loader.load('run.fbx', (animacion) => { _OnLoad('run', animacion); });
        });

    }

    Update(){
        if(!this._target){
            return;
        }
        this._stateMachine.Update(timeInSeconds, this._input);

        const velocity = this._velocity;
        const frameDeceleration = new THREE.Vector3(
            velocity.x * this._deceleration.x,
            velocity.y * this._deceleration.y,
            velocity.z * this._deceleration.z
        );
        frameDeceleration.multiplyScalar(timeInSeconds);
        frameDeceleration.z = Math.sign(frameDeceleration.z) * Math.min(Math.abs(frameDeceleration.z), Math.abs(velocity.z));
        velocity.add(frameDeceleration);

        const controlObject = this._target;
        const _Q = new THREE.Quaternion();
        const _A = new THREE.Vector3();
        const _R = controlObject.quaternion.clone();
        const acc = this._aceleration.clone();

        if(this._input._keys.shift){
            acc.multiplyScalar(3.0);
        }
        if(this._input._keys.forward){
            velocity.z  += acc.z * timeInSeconds;
        }
        if(this._input._keys.backward){
            velocity.z -= acc.z * timeInSeconds;
        }
        if(this._input._keys.left){
            _A.set(0,1,0);
            _Q.setFromAxisAngle(_A, 4.0 * Math.PI * timeInSeconds * this._aceleration.y);
            _R.multiply(_Q);
        }
        if(this._input._keys.rigth){
            _A.set(0,1,0);
            _Q.setFromAxisAngle(_A, 4.0 * -Math.PI * timeInSeconds * this._aceleration.y);
            _R.multiply(_Q);
        }

        controlObject.quaternion.copy(_R);

        const oldPosition = new THREE.Vector3();
        oldPosition.copy(controlObject.position);

        const forward = new THREE.Vector3(0,0,1);
        forward.aplyQuaternion(controlObject.quaternion);
        forward.normalize();

        const sideways = new THREE.Vector3(1,0,0);
        sideways.aplyQuaternion(controlObject.quaternion);
        sideways.normalize();

        sideways.multiplyScalar(velocity.x * timeInSeconds);
        forward.multiplyScalar(velocity.z * timeInSeconds);

        controlObject.position.add(forward);
        controlObject.position.add(sideways);

        oldPosition.copy(controlObject.position);

        if(this._mixer){
            this._mixer.Update(timeInSeconds);
        }
    }
}

// input Personaje
class BasicCharacterControllerInput {
    constructor() {
        this._keys = {
            forward: false,
            backward: false,
            left: false,
            rigth: false,
            shift: false,
            down: false
        };
        document.addEventListener("keydown", (e) => this._onKeyDown(e), false);
        document.addEventListener("keyup", (e) => this._onKeyUp(e), false);
    }

    _onKeyDown(event) {
        switch (event.keyCode) {
            case 87: //w
                this._keys.forward = true;
                break;
            case 65: //a
                this._keys.left = true;
                break;
            case 83: //s
                this._keys.backward = true;
                break;
            case 68: //d
                this._keys.rigth = true;
                break;
            case 16: // shift
                this._keys.shift = true;
                break;
            case 67: //c
                this._keys.down = true;
                break;
        }
    }
    _onKeyUp(event) {
        switch (event.keyCode) {
            case 87: //w
                this._keys.forward = false;
                break;
            case 65: //a
                this._keys.left = false;
                break;
            case 83: //s
                this._keys.backward = false;
                break;
            case 68: //d
                this._keys.rigth = false;
                break;
            case 16: // shift
                this._keys.shift = false;
                break;
            case 67: //c
                this._keys.down = false;
                break;
        }
    }
}

// Maquina de Estados
class FiniteStateMachine {
    constructor() {
        this._states = {};
        this._currentStates = null;
    }

    _AddState(name, type) {
        this._states[name] = type;
    }

    SetState(name) {
        const prevState = this._currentStates;

        if (prevState) {
            if (prevState.Name === name) {
                return;
            }
            prevState.Exit();
        }

        const state = new this._states[name](this);
        this._currentStates = state;
        state.Enter(prevState);
    }

    Update(timeEslapsed, input) {
        if (this._currentStates) {
            this._currentStates.Update(timeEslapsed, input);
        }
    }
}

//Maquina de Estados Personaje
class CharacterFSM extends FiniteStateMachine {
    constructor(proxy) {
        super();
        this._proxy = proxy;
        this._Init();
        
        //this._AddState('down', DownState);
    }

    _Init() {
        this._AddState('idle', IdleState);
        this._AddState('walk', WalkState);
        this._AddState('run', RunState);
      }
}

// Estados del personaje
class State {
    constructor(parent) {
        this._parent = parent
    }

    Enter() { }
    Exit() { }
    Update() { }
}

class IdleState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'idle'
    }

    Enter(prevState) {
        const idleAction = this._parent._proxy._animations['idle'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;
            idleAction.time = 0.0;
            idleAction.enable = true;
            idleAction.setEffectiveTimeScale(1.0);
            idleAction.setEffectiveWeight(1, 0);
            idleAction.crossFadeFrom(prevAction, 0.5, true);//transicion del animaciones
            idleAction.play();
        } else {
            idleAction.play();
        }
    }

    Exit() {

    }

    Update(_, input) {
        if (input._keys.forward || input._keys.backward) {
            this._parent.SetState('walk')
        }
    }

}

class WalkState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'walk';
    }

    Enter(prevState) {
        const curAction = this._parent._proxy._animations['walk'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevAction.Name].action;
            curAction.enable = true;

            if (prevAction.Name = 'run') {
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ratio;
            } else {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }

            curAction.crossFadeFrom(prevAction, 0.5, true);
            curAction.play();
        } else {
            curAction.play();
        }
    }

    Exit() {

    }

    Update(_, input) {
        if (input._keys.forward || input._keys.backward) {
            if (input._keys.shift) {
                this._parent.SetState('run');
            }
            return;
        }
        this._parent.SetState('idle');
    }
}

class RunState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'run';
    }

    Enter(prevState) {
        const curAction = this._parent._proxy._animations['run'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevAction.Name].action;
            curAction.enable = true;

            if (prevAction.Name = 'walk') {
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ratio;
            } else {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }

            curAction.crossFadeFrom(prevAction, 0.5, true);
            curAction.play();
        } else {
            curAction.play();
        }
    }

    Exit() {

    }

    Update(_, input) {
        if (input._keys.forward || input._keys.backward) {
            if (!input._keys.shift) {
                this._parent.SetState('walk');
            }
            return;
        }
        this._parent.SetState('idle');
    }
}

//Scene
class VisualScene {
    constructor(){
        this._threejs = new THREE.WebGLRenderer({
            antialias : true,
        });
        this._threejs.outputEncoding = THREE.sRGBEncoding;
        this._threejs.shadowMap.enabled = true;
        this._threejs.shadowMap.type = THREE.PCFSoftShadownMap;
        this._threejs.setPixelRatio(window.devicePixelRatio);
        this._threejs.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this._threejs.domElement);

        window.addEventListener("resize", () => {
            this._OnWindowResize();
        },false)

        this._camera = new THREE.PerspectiveCamera(60, 1920/1080, 1.0, 1500);
        this._camera.position.set(25,10,25);

        this._scene = new THREE.Scene();

        let light = new THREE.DirectionalLight(0XFFFFFF, 1.0);
        light.position.set(-100,100,100);
        light.target.position.set(0,0,0);
        light.castShadown = true;
        this._scene.add(light);

        light = new THREE.AmbientLight(0XFFFFFF, 0.25);
        this._scene.add(light);

        const controls = new OrbitControls(this._camera, this._threejs.domElement);
        controls.target.set(0,10,0);
        controls.update();

        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(100,100,10,10),
            new THREE.MeshStandardMaterial({
                color : 0X808080
            })
        );
        plane.castShadown = false;
        plane.receiveShadown = true;
        this._scene.add(plane);

        this._mixers = [];
        this._previousRAF = null;
        this._LoadAnimationModel();
        this._RAF();
    }

    _LoadAnimationModel(){
        const params = {
            camera : this._camera,
            scene : this._scene
        }
        this._controls = new BasicCharacterController(params);
    }

    _RAF(){
        requestAnimationFrame((t) => {
            if(this._previousRAF === null){
                this._previousRAF = t;
            }

            this._RAF();

            this._threejs.render(this._scene, this._camera);
            this._Step(t - this._previousRAF);
            this._previousRAF = t;
        });
    }

    _Step(timeEslapsed){
        const timeEslapsedS = timeEslapsed * 0.001;
        if(this._mixers){
            this._mixers.map(m => m.Update(timeEslapsedS));
        }
        if(this._controls){
            this._controls.Update(timeEslapsedS)
        }
    }

    _OnWindowResize(){
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.UpdateProyectMatrix();
        this._threejs.setSize(window.innerWidth, window.innerHeight);
    }
}

let _APP = null;

document.addEventListener("DOMContentLoaded", () =>{
    _APP = new VisualScene();
})