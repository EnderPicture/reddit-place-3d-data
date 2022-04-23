export const vertexShader = `
attribute vec3 color;

varying vec3 vColor;
varying vec4 locCoord;

uniform float scrollPos;


void main() {

  vColor = color;

  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

  gl_PointSize = 3.0;
  // gl_PointSize = smoothstep(1.0,10.0,abs(scrollPos-mvPosition.y));

  gl_Position = projectionMatrix * mvPosition;

  locCoord = gl_Position;

}
`;
export const fragShader = `
uniform sampler2D pointTexture;
uniform float opacity;

varying vec3 vColor;
varying vec4 locCoord;

void main() {

  gl_FragColor = vec4(vColor/255.0, opacity );
  gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord );
}
`;