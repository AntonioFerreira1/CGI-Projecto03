precision highp float;

const int MAX_LIGHTS = 8;

struct LightInfo {
    vec3 pos;
    vec3 Ia;
    vec3 Id;
    vec3 Is;
    bool isDirectional;
    bool isActive;
};

struct MaterialInfo {
    vec3 Ka;
    vec3 Kd;
    vec3 Ks;
    float shininess;
};

uniform int uNLights; // Effective number of lights used

uniform LightInfo uLight[MAX_LIGHTS]; // The array of lights present in the scene
uniform MaterialInfo uMaterial;  // The material of the object being drawn

uniform mat4 mViewNormals; // view transformation (for vectors)

uniform mat4 mView; // view transformation (for points)

varying vec3 fPosC; 
varying vec3 fNormal;


void main() {
    vec4 illumModel;

    /*
    Ciclo que calcula o somatorio das componentes da luz (ambient + diffuse + specular):
    I = ambientColor + diffuse + specular
    */
    for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i == uNLights) break;

        vec3 ambientColor = uLight[i].Ia * uMaterial.Ka; // Ia*Ka
        vec3 diffuseColor = uLight[i].Id * uMaterial.Kd; // Id*Kd
        vec3 specularColor = uLight[i].Is * uMaterial.Ks; // Is*Ks

        vec3 L;

        // compute light vector in camera frame
        if (!uLight[i].isDirectional) 
            L = normalize((mViewNormals * vec4(uLight[i].pos, 0.0)).xyz);
        else
            L = normalize((mView * vec4(uLight[i].pos, 0.0)).xyz - fPosC);

        // compute normal in camera frame
        vec3 N = normalize(fNormal);

        // compute the view vector
        vec3 V = normalize(-fPosC); // perspective projection

        vec3 R = reflect(-L,N);

        float diffuseFactor = max( dot(L,N), 0.0 );
        vec3 diffuse = diffuseFactor * diffuseColor;

        float specularFactor = pow( max(dot(R,V), 0.0), uMaterial.shininess );
        vec3 specular = specularFactor * specularColor;

        // add the 3 components to the Illumination model
        // (ambient, diffuse, specular)

        illumModel += vec4(ambientColor + diffuse + specular, 1.0);
    }

    gl_FragColor = illumModel;

}