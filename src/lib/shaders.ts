export const vertexShader = `
attribute vec3 color;
varying vec3 vColor;

in uint userId;
flat out uint vUserId;
uniform uint selectedUserId;

void main() {

  vColor = color;
  vUserId = userId;

  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  
  gl_PointSize = 3.0;
  if (selectedUserId == vUserId) {
    gl_PointSize = 10.0;
  }
  gl_Position = projectionMatrix * mvPosition;
}
`;
export const fragShader = `
uniform sampler2D pointTexture;
uniform float opacity;
uniform float colorAdd;
uniform uint selectedUserId;

varying vec3 vColor;
flat in uint vUserId;

void main() {

  gl_FragColor = vec4(vColor/255.0 + colorAdd, opacity );
  if (selectedUserId == vUserId) {
    gl_FragColor.a = 1.0;
  }
  gl_FragColor.a *= texture2D( pointTexture, gl_PointCoord ).a;
}
`;