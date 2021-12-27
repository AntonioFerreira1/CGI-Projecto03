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

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    gl.clearColor(0.2, 0.2, 0.2, 1.0);

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
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mNormals"), false, flatten(normalMatrix(modelView())));
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
        eyeFolder.add(cam.eye, "0").step(0.1);
        eyeFolder.add(cam.eye, "1").step(0.1);
        eyeFolder.add(cam.eye, "2").step(0.1);
        eyeFolder.open();

    const atFolder = cameraFolder.addFolder("At");
        atFolder.add(cam.at, "0").step(0.1);
        atFolder.add(cam.at, "1").step(0.1);
        atFolder.add(cam.at, "2").step(0.1);
        atFolder.open();

    const upFolder = cameraFolder.addFolder("Up");
        upFolder.add(cam.up, "0", -1, 1).step(0.1);
        upFolder.add(cam.up, "1", -1, 1).step(0.1);
        upFolder.add(cam.up, "2", -1, 1).step(0.1);
        upFolder.open();

    const lightsFolder = gui.addFolder("Lights");
        let addLightButton = { Add:addLight };
        lightsFolder.add(addLightButton, "Add");
        lightsFolder.open();


    const gui2 = new dat.GUI();

    gui2.add(shape, "object", {Sphere: 's', Cube: 'c', Torus: 't', Cylinder: 'cy', Pyramid: 'p'});

    const materialFolder = gui2.addFolder("material");

    materialFolder.addColor(material, "Ka");
    materialFolder.addColor(material, "Kd");
    materialFolder.addColor(material, "Ks");

    materialFolder.add(material, "shininess").min(1);

    materialFolder.open();

    
    /**
     * Creates a new light adding it to the GUI
     */
    function addLight() {
        if (lightsArray.length < MAX_LIGHTS) {
            let light = {
                x: 0.0,
                y: 1.0,
                z: 0.0,
                ambient: [MAX_RGB, MAX_RGB, MAX_RGB],
                diffuse: [MAX_RGB, MAX_RGB, MAX_RGB],
                specular: [MAX_RGB, MAX_RGB, MAX_RGB],
                directional : false,
                active: true
            };

            lightsArray.push(light);



            const newLight = lightsFolder.addFolder("Light" + lightsArray.length);

                const position = newLight.addFolder("position");
                    position.add(light, "x");
                    position.add(light, "y");
                    position.add(light, "z");

                newLight.addColor(light, "ambient");
                newLight.addColor(light, "diffuse");
                newLight.addColor(light, "specular")
                newLight.add(light, "directional");
                newLight.add(light, "active");

                position.open();
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
                
                gl.useProgram(programLights);

                const uLightColor = gl.getUniformLocation(programLights, "uColor")

                gl.uniform3fv(uLightColor, vec3(lightsArray[i].specular[0]/MAX_RGB, lightsArray[i].specular[1]/MAX_RGB, lightsArray[i].specular[2]/MAX_RGB));
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
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mViewNormals"), false, flatten(normalMatrix(mView)));
        
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));

        gl.uniform3fv(uKa, vec3(material.Ka[0]/MAX_RGB, material.Ka[1]/MAX_RGB, material.Ka[2]/MAX_RGB));
        gl.uniform3fv(uKd, vec3(material.Kd[0]/MAX_RGB, material.Kd[1]/MAX_RGB, material.Kd[2]/MAX_RGB));
        gl.uniform3fv(uKs, vec3(material.Ks[0]/MAX_RGB, material.Ks[1]/MAX_RGB, material.Ks[2]/MAX_RGB));
        gl.uniform1f(uShininess, material.shininess);

        for(let i = 0; i < lightsArray.length; i++){
            const uNLights = gl.getUniformLocation(program, "uNLights");

            const uIPos = gl.getUniformLocation(program, "uLight[" + i + "].pos");

            const uIa = gl.getUniformLocation(program, "uLight[" + i + "].Ia");
            const uId = gl.getUniformLocation(program, "uLight[" + i + "].Id");
            const uIs = gl.getUniformLocation(program, "uLight[" + i + "].Is");

            const uDir = gl.getUniformLocation(program, "uLight[" + i + "].isDirectional");
            const uActive = gl.getUniformLocation(program, "uLight[" + i + "].isActive");

            gl.uniform1i(uNLights, lightsArray.length);

            gl.uniform3f(uIPos, lightsArray[i].x, lightsArray[i].y, lightsArray[i].z);

            gl.uniform3f(uIa, lightsArray[i].ambient[0]/MAX_RGB, lightsArray[i].ambient[1]/MAX_RGB, lightsArray[i].ambient[2]/MAX_RGB);
            gl.uniform3f(uId, lightsArray[i].diffuse[0]/MAX_RGB, lightsArray[i].diffuse[1]/MAX_RGB, lightsArray[i].diffuse[2]/MAX_RGB);
            gl.uniform3f(uIs, lightsArray[i].specular[0]/MAX_RGB, lightsArray[i].specular[1]/MAX_RGB, lightsArray[i].specular[2]/MAX_RGB);

            (lightsArray[i].directional) ? gl.uniform1i(uDir, 1) : gl.uniform1i(uDir, 0);
            (lightsArray[i].active) ? gl.uniform1i(uActive, 1) : gl.uniform1i(uActive, 0);
        }
        
        gl.useProgram(program);

        pushMatrix();
            drawBase();
        popMatrix();
        pushMatrix()
            drawShape();
        popMatrix();
        
        gl.useProgram(programLights);
        gl.uniformMatrix4fv(gl.getUniformLocation(programLights, "mModelView"), false, flatten(modelView()));
        gl.uniformMatrix4fv(gl.getUniformLocation(programLights, "mProjection"), false, flatten(mProjection));


        if (options.showLights) {
            drawLights();
        }

    }
    

}


const urls = ["shader.vert", "shader.frag", "shaderLight.vert", "shaderLight.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))