attribute vec4 vPosition;
attribute vec3 vNormal;

uniform mat4 mModelView; // model-view transformation
uniform mat4 mNormals; // inverse transpose of modelView
uniform mat4 mProjection; // projection matrix

varying vec3 fPosC;
varying vec3 fNormal;



/*
PROBLEMA: O enunciado diz que so podemos ter o MAX_LIGHTS no frag e na app, logo nao podemos fazer um ciclo
para todos os valores de N e V
*/
void main() {

    fPosC = (mModelView * vPosition).xyz;

    fNormal = vec3(mNormals * vec4(vNormal, 0.0));

    gl_Position = mProjection * mModelView * vPosition;
}