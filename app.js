import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, mult, normalMatrix, inverse, vec3, vec4, add, scale, perspective  } from "../../libs/MV.js";
import {modelView, loadMatrix, multRotationX, multRotationY, multRotationZ, multScale, multTranslation, popMatrix, pushMatrix} from "../../libs/stack.js";

import * as dat from '../../libs/dat.gui.module.js';

import * as SPHERE from '../../libs/sphere.js';
import * as CUBE from '../../libs/cube.js';
import * as TORUS from '../../libs/torus.js';
import * as CYLINDER from '../../libs/cylinder.js';
import * as PYRAMID from '../../libs/pyramid.js';

/**
 * @author António Ferreira 58340 
 */

/** @type WebGLRenderingContext */
let gl;

let time = 0;           // Global simulation time in days
let speed = 1/60.0;     // Speed (how many days added to time on each render pass
let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)
let mView;

let VP_DISTANCE = 6;

let options = {
    backfaceCulling : true,
    depthTest : true,
    showLights : true
}

let cam = {
    fovy : 45,
    aspect : 1,
    near : 0.1,
    far : 20  
}

let eye = {
    x : 0,
    y : 0, 
    z : 0
}

let at = {
    x : 0,
    y : 0, 
    z : 0
}

let up = {
    x : 0,
    y : 0, 
    z : 0
}


function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = perspective(cam.fovy, cam.aspect, cam.near, cam.far);

    mode = gl.LINES; 

    mView = lookAt([VP_DISTANCE, VP_DISTANCE, VP_DISTANCE], [0,0,0], [0,1,0]);
    loadMatrix(mView);

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    document.onkeydown = function(event) {
        switch(event.key) {
            case 'W':
                mode = gl.LINES; 
                break;
            case 'S':
                mode = gl.TRIANGLES;
                break;
            case '1':
                mView = lookAt([VP_DISTANCE, 0, 0], [0,0,0], [0,1,0]);
                loadMatrix(mView);
                break;
            case '2':
                mView = lookAt([0, VP_DISTANCE, 0], [0,0,0], [-1,1,0]);
                loadMatrix(mView);
                break;
            case '3':
                mView = lookAt([0, 0, VP_DISTANCE], [0,0,0], [0,1,0]);
                loadMatrix(mView);
                break;
            case '4':
                mView = lookAt([VP_DISTANCE, VP_DISTANCE, VP_DISTANCE], [0,0,0], [0,1,0]);
                loadMatrix(mView);
                break;
            case "ArrowUp":
                tankXTranslation += 0.05;
                wheelsRotation -= (360.0 * 0.05) / (2.0 * Math.PI * WHEEL_RADIUS);
                break;
            case "ArrowDown":
                tankXTranslation -= 0.05;
                wheelsRotation += (360.0 * 0.05) / (2.0 * Math.PI * WHEEL_RADIUS);
                break;
            case "w":
                if(hatchZRotation <= 20)
                    hatchZRotation += 1;
                break;
            case "s":
                if(hatchZRotation >= -34)
                    hatchZRotation -= 1;
                break;
            case "a":
                hatchYRotation += 1;
                break;
            case "d":
                hatchYRotation -= 1;
                break;
            case " ":
                fire();
                break;
            case "+":
                VP_DISTANCE -= 1;
                break;
            case "-":
                VP_DISTANCE += 1;
                break;
        }
    }
    gl.clearColor(0.71875, 0.83984375, 0.91015625, 1.0);
    
    SPHERE.init(gl);
    CUBE.init(gl);
    TORUS.init(gl);
    CYLINDER.init(gl);
    PYRAMID.init(gl);

    gl.enable(gl.DEPTH_TEST);   // Enables Z-buffer depth test

    
    window.requestAnimationFrame(render);


    function resize_canvas(event)
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0,0,canvas.width, canvas.height);
        mProjection = perspective(cam.fovy, cam.aspect, cam.near, cam.far);
    }

    function uploadModelView(){
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
    }




    const gui = new dat.GUI();

    const optionsFolder = gui.addFolder("Options");
        optionsFolder.add(options, "backfaceCulling");
        optionsFolder.add(options, "depthTest");
        optionsFolder.add(options, "showLights");
        optionsFolder.open();


    const cameraFolder = gui.addFolder("Camera");
        cameraFolder.add(cam, "fovy", 0, 90, 1);
        cameraFolder.add(cam, "near", 0, 90, 1);
        cameraFolder.add(cam, "far", 0, 90, 1);
        cameraFolder.open();

    const eyeFolder = cameraFolder.addFolder("Eye");
        eyeFolder.add(eye, "x", 0, 90, 1);
        eyeFolder.add(eye, "y", 0, 90, 1);
        eyeFolder.add(eye, "z", 0, 90, 1);
        eyeFolder.open();

    const atFolder = gui.addFolder("At");
        atFolder.add(at, "x", 0, 90, 1);
        atFolder.add(at, "y", 0, 90, 1);
        atFolder.add(at, "z", 0, 90, 1);
        atFolder.open();

    const upFolder = gui.addFolder("Up");
        upFolder.add(up, "x", 0, 90, 1);
        upFolder.add(up, "y", 0, 90, 1);
        upFolder.add(up, "z", 0, 90, 1);
        upFolder.open();

    const lightsFolder = gui.addFolder("Lights");
        lightsFolder.open();




    function render()
    {
        window.requestAnimationFrame(render);
        mProjection = perspective(cam.fovy, cam.aspect, cam.near, cam.far);
        
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program);

        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));
    }


}



const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))