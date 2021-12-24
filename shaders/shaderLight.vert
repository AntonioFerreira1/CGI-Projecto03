attribute vec4 vPosition;
uniform mat4 mProjection; // projection matrix
uniform mat4 mModelView;

void main() {
    gl_Position = mProjection * mModelView * vPosition;
}

