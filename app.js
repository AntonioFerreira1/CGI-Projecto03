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
 * @author Tiago Fernandes 57677
 */

/** @type WebGLRenderingContext */
let gl;

let time = 0;           // Global simulation time in days
let speed = 1/60.0;     // Speed (how many days added to time on each render pass
let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)
let mView;


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
    Ks: [255,255,255],
    shininess: 50
}


function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let aspect = canvas.width / canvas.height;
    
    gl = setupWebGL(canvas);

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = perspective(cam.fovy, aspect, cam.near, cam.far);

    mode = gl.TRIANGLES; 

    mView = lookAt(cam.eye, cam.at, cam.up);
    loadMatrix(mView);

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    gl.clearColor(0.71875, 0.83984375, 0.91015625, 1.0);

    const fColor = gl.getUniformLocation(program, "fColor");
    
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
        mProjection = perspective(cam.fovy, aspect, cam.near, cam.far);
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
        cameraFolder.add(cam, "near", 0.1, 5, 1);
        cameraFolder.add(cam, "far", 6, 20, 1);
        cameraFolder.open();

    const eyeFolder = cameraFolder.addFolder("Eye");
        eyeFolder.add(cam.eye, "0", -15, 15, 1);
        eyeFolder.add(cam.eye, "1", -15, 15, 0.1);
        eyeFolder.add(cam.eye, "2", -16, 15, 1);
        eyeFolder.open();

    const atFolder = cameraFolder.addFolder("At");
        atFolder.add(cam.at, "0", 0, 90, 1);
        atFolder.add(cam.at, "1", 0, 90, 1);
        atFolder.add(cam.at, "2", 0, 90, 1);
        atFolder.open();

    const upFolder = cameraFolder.addFolder("Up");
        upFolder.add(cam.up, "0", 0, 90, 1);
        upFolder.add(cam.up, "1", 0, 90, 1);
        upFolder.add(cam.up, "2", 0, 90, 1);
        upFolder.open();

    const lightsFolder = gui.addFolder("Lights");
        lightsFolder.open();


    const gui2 = new dat.GUI();

    gui2.add(shape, "object", {Sphere: 's', Cube: 'c', Torus: 't', Cylinder: 'cy', Pyramid: 'p'});

    const materialFolder = gui2.addFolder("material");

    materialFolder.addColor(material, "Ka");
    materialFolder.addColor(material, "Kd");
    materialFolder.addColor(material, "Ks");

    materialFolder.add(material, "shininess");

    materialFolder.open();

    console.log(material.Ka[0])
    console.log(material.Ka[1])
    console.log(material.Ka[2])

    /**
     * Draws the base of the deformed cube which works as a base to the object
     */
    function drawBase() {
        gl.uniform4f(fColor, material.Kd[0]/255, material.Kd[1]/255, material.Kd[2]/255, 1.0);
        pushMatrix();
            multTranslation([0, -0.55, 0]);
            multScale([3, 0.1, 3]);
            uploadModelView();
            CUBE.draw(gl, program, mode);
        popMatrix();
    }


    /**
     * Draws the object depending on the shape selected in dropdown list
     */
    function drawShape() {
        gl.uniform4f(fColor, material.Ka[0]/255, material.Ka[1]/255, material.Ka[2]/255, 1.0);
        pushMatrix()
            uploadModelView();
            switch(shape.object) {
                case 's': SPHERE.draw(gl, program, mode); break;
                case 'c': CUBE.draw(gl, program, mode); break;
                case 't': TORUS.draw(gl, program, mode); break;
                case 'cy': CYLINDER.draw(gl, program, mode); break;
                case 'p': PYRAMID.draw(gl, program, mode); break;
                default: break;
            }
        popMatrix();
    }

    function render()
    {
        window.requestAnimationFrame(render);
        
        mView = lookAt(cam.eye, cam.at, cam.up);
        loadMatrix(mView);
        
        mProjection = perspective(cam.fovy, aspect, cam.near, cam.far);
        
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program);

        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));

        pushMatrix();
            drawBase();
        popMatrix();
        pushMatrix()
            drawShape();
        popMatrix();
    }


}



const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))