import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, mult, normalMatrix, inverse, vec3, vec4, add, scale, perspective, transpose  } from "../../libs/MV.js";
import {modelView, loadMatrix, multRotationX, multRotationY, multRotationZ, multScale, multTranslation, popMatrix, pushMatrix} from "../../libs/stack.js";

import * as dat from '../../libs/dat.gui.module.js';

import * as SPHERE from '../../libs/sphere.js';
import * as CUBE from '../../libs/cube.js';
import * as TORUS from '../../libs/torus.js';
import * as CYLINDER from '../../libs/cylinder.js';
import * as PYRAMID from '../../libs/pyramid.js';

/**
 * @author António Ferreira 58340 
 * @author Tiago Fernandes 57677
 */

/** @type WebGLRenderingContext */
let gl;

let time = 0;           // Global simulation time in days
let speed = 1/60.0;     // Speed (how many days added to time on each render pass
let mView;

const MAX_RGB = 255;
const MAX_LIGHTS = 8;

let lightsArray = [];        // Stores the lightsArray created in the program

let options = {
    backfaceCulling : true,
    depthTest : true,
    showLights : true
}

// Camera settings

let cam = {
    fovy : 45,
    near : 0.1,
    far : 20,  
    eye : vec3(0, 0, 5),    
    at : vec3(0, 0, 0),
    up : vec3(0, 1, 0)
}

// Shape of object to be drawn

let shape = {
    object: 's'
}

// How the object looks

let material = {
    Ka: [0,25,0],
    Kd: [0,100,0],
    Ks: [MAX_RGB,MAX_RGB,MAX_RGB],
    shininess: 50.0
}



function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let aspect = canvas.width / canvas.height;
    
    gl = setupWebGL(canvas);

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);
    let programLights = buildProgramFromSources(gl, shaders["shaderLight.vert"], shaders["shaderLight.frag"]);

    let mProjection = perspective(cam.fovy, aspect, cam.near, cam.far);

    mView = lookAt(cam.eye, cam.at, cam.up);
    loadMatrix(mView);

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    gl.clearColor(0.71875, 0.83984375, 0.91015625, 1.0);

    const fColor = gl.getUniformLocation(program, "fColor");

    const uKa = gl.getUniformLocation(program, "uMaterial.Ka");
    const uKd = gl.getUniformLocation(program, "uMaterial.Kd");
    const uKs = gl.getUniformLocation(program, "uMaterial.Ks");
    const uShininess = gl.getUniformLocation(program, "uMaterial.shininess");
    
    SPHERE.init(gl);
    CUBE.init(gl);
    TORUS.init(gl);
    CYLINDER.init(gl);
    PYRAMID.init(gl);

    gl.cullFace(gl.BACK);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST)    // Enables Z-buffer depth test
    
    window.requestAnimationFrame(render);


    function resize_canvas(event)
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0,0,canvas.width, canvas.height);
        mProjection = perspective(cam.fovy, aspect, cam.near, cam.far);
    }

    function uploadModelView(){
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mNormals"), false, flatten(inverse(transpose(modelView()))));
    }

    const gui = new dat.GUI();

    const optionsFolder = gui.addFolder("Options");
        optionsFolder.add(options, "backfaceCulling").onChange(function () {
            (options.backfaceCulling) ? gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE);
        });
        optionsFolder.add(options, "depthTest").onChange(function () {
            (options.depthTest) ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST);
        });
        optionsFolder.add(options, "showLights");
        optionsFolder.open();


    const cameraFolder = gui.addFolder("Camera");
        cameraFolder.add(cam, "fovy", 0, 90);
        cameraFolder.add(cam, "near", 0.1, 5);
        cameraFolder.add(cam, "far", 6, 20);
        cameraFolder.open();

    const eyeFolder = cameraFolder.addFolder("Eye");
        eyeFolder.add(cam.eye, "0");
        eyeFolder.add(cam.eye, "1");
        eyeFolder.add(cam.eye, "2");
        eyeFolder.open();

    const atFolder = cameraFolder.addFolder("At");
        atFolder.add(cam.at, "0");
        atFolder.add(cam.at, "1");
        atFolder.add(cam.at, "2");
        atFolder.open();

    const upFolder = cameraFolder.addFolder("Up");
        upFolder.add(cam.up, "0", -1, 1);
        upFolder.add(cam.up, "1", -1, 1);
        upFolder.add(cam.up, "2", -1, 1);
        upFolder.open();

    const lightsFolder = gui.addFolder("Lights");
        let addLightButton = { Add:addLight}
        lightsFolder.add(addLightButton, "Add");
        lightsFolder.open();


    const gui2 = new dat.GUI();

    gui2.add(shape, "object", {Sphere: 's', Cube: 'c', Torus: 't', Cylinder: 'cy', Pyramid: 'p'});

    const materialFolder = gui2.addFolder("material");

    materialFolder.addColor(material, "Ka");
    materialFolder.addColor(material, "Kd");
    materialFolder.addColor(material, "Ks");

    materialFolder.add(material, "shininess");

    materialFolder.open();

    
    /**
     * Creates a new light adding it to the GUI
     */
    function addLight(event) {
        if (lightsArray.length < MAX_LIGHTS) {
            let light = {
                x: 0,
                y: 0,
                z: 0,
                ambient: [0, 0, 0],
                diffuse: [0, 0, 0],
                specular: [0, 0, 0],
                directional : false,
                active: true
            };

            lightsArray.push(light);

            const newLight = lightsFolder.addFolder("Light" + lightsArray.length);

            const position = newLight.addFolder("position");
                position.add(light, "x");
                position.add(light, "y");
                position.add(light, "z");
                position.addColor(light, "ambient");
                position.addColor(light, "diffuse");
                position.addColor(light, "specular")
                position.add(light, "directional");
                position.add(light, "active");
        }
    }

    /**
     * Draws the base of the deformed cube which works as a base to the object
     */
    function drawBase() {
        pushMatrix();
            multTranslation([0, -0.55, 0]);
            multScale([3, 0.1, 3]);
            uploadModelView();
            CUBE.draw(gl, program, gl.TRIANGLES);
        popMatrix();
    }


    /**
     * Draws the object depending on the shape selected in dropdown list
     */
    function drawShape() {
        pushMatrix()
            uploadModelView();
            switch(shape.object) {
                case 's': SPHERE.draw(gl, program, gl.TRIANGLES); break;
                case 'c': CUBE.draw(gl, program, gl.TRIANGLES); break;
                case 't': TORUS.draw(gl, program, gl.TRIANGLES); break;
                case 'cy': CYLINDER.draw(gl, program, gl.TRIANGLES); break;
                case 'p': PYRAMID.draw(gl, program, gl.TRIANGLES); break;
                default: break;
            }
        popMatrix();
    }

    function drawLights(){
        for(let i = 0; i < lightsArray.length; i++){
            pushMatrix();
                
                multTranslation([lightsArray[i].x, lightsArray[i].y, lightsArray[i].z]);
                multScale([0.05, 0.05, 0.05]);
                gl.uniformMatrix4fv(gl.getUniformLocation(programLights, "mModelView"), false, flatten(modelView()));   
                SPHERE.draw(gl, programLights, gl.TRIANGLES);
                
            popMatrix();
        }
    }

    function render()
    {
        window.requestAnimationFrame(render);
        
        mView = lookAt(cam.eye, cam.at, cam.up);
        loadMatrix(mView);
        
        mProjection = perspective(cam.fovy, aspect, cam.near, cam.far);
        
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program);

        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mView"), false, flatten(mView));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mViewNormals"), false, flatten(inverse(transpose(mView))));
        
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));

        gl.uniform3fv(uKa, vec3(material.Ka[0]/MAX_RGB, material.Ka[1]/MAX_RGB, material.Ka[2]/MAX_RGB));
        gl.uniform3fv(uKd, vec3(material.Kd[0]/MAX_RGB, material.Kd[1]/MAX_RGB, material.Kd[2]/MAX_RGB));
        gl.uniform3fv(uKs, vec3(material.Ks[0]/MAX_RGB, material.Ks[1]/MAX_RGB, material.Ks[2]/MAX_RGB));
        gl.uniform1f(uShininess, material.shininess);

        if(lightsArray.length > 0) {
            const uNLights = gl.getUniformLocation(program, "uNLights");

            const uIPos = gl.getUniformLocation(program, "uLight[0].pos");
    
            const uIa = gl.getUniformLocation(program, "uLight[0].Ia");
            const uId = gl.getUniformLocation(program, "uLight[0].Id");
            const uIs = gl.getUniformLocation(program, "uLight[0].Is");
    
            const uDir = gl.getUniformLocation(program, "uLight[0].isDirectional");
            const uActive = gl.getUniformLocation(program, "uLight[0].isActive");
    
            gl.uniform1i(uNLights, lightsArray.length);

            gl.uniform3f(uIPos, lightsArray[0].x, lightsArray[0].y, lightsArray[0].z);
    
            gl.uniform3fv(uIa, lightsArray[0].ambient);
            gl.uniform3fv(uId, lightsArray[0].diffuse);
            gl.uniform3fv(uIs, lightsArray[0].specular);
    
            (lightsArray[0].directional) ? gl.uniform1i(uDir, 1) : gl.uniform1i(uDir, 0);
            (lightsArray[0].active) ? gl.uniform1i(uActive, 1) : gl.uniform1i(uActive, 0);
        }
        

        pushMatrix();
            drawBase();
        popMatrix();
        pushMatrix()
            drawShape();
        popMatrix();
        
        gl.useProgram(programLights);
        gl.uniformMatrix4fv(gl.getUniformLocation(programLights, "mModelView"), false, flatten(modelView()));
        gl.uniformMatrix4fv(gl.getUniformLocation(programLights, "mProjection"), false, flatten(mProjection));

        drawLights();


    }
    

}


const urls = ["shader.vert", "shader.frag", "shaderLight.vert", "shaderLight.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))