attribute vec4 vPosition;
attribute vec4 vNormal;

uniform mat4 mModelView; // model-view transformation
uniform mat4 mNormals; // model-view transformation for normals
uniform mat4 mProjection; // projection matrix

varying vec3 fPosC;



/*
PROBLEMA: O enunciado diz que so podemos ter o MAX_LIGHTS no frag e na app, logo nao podemos fazer um ciclo
para todos os valores de N e V
*/
void main() {

    // compute position in camera frame
    fPosC = (mModelView * vPosition).xyz;

    gl_Position = mProjection * mModelView * vPosition;
}