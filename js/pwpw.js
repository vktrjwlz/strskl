var rndrr;

var pointerDown = false;
var anchorP = vec2.fromValues(128.0, 128.0);
var lastP = vec2.create();

var dlny = null;

function pwpw() {
  var cnvs = document.getElementById("lzrcnvs");
  rndrr = new lzr.rndrr(cnvs);

  rndrr.zoom = vec2.fromValues(12.0, 12.0);
  rndrr.setResolution();

  console.log("creating earring");

  // create earring
  errng = new mwhp.errng();

  errng.generate();
  errng.pn.rgba = [0.7, 0.0, 0.0, 0.7]; // reddish

  rndrr.mshs.push(errng.pn);

  console.log("buffing earring");

  window.addEventListener( 'resize', onWindowResize, false );
  // document.addEventListener( 'mousedown', onMouseDown, false );
  // document.addEventListener( 'mousemove', onMouseMove, false );
  // document.addEventListener( 'mouseup', onMouseUp, false );

  rndrr.buff(); // build mesh buffers, call after changing meshes
  rndrr.render(); // draw meshes
}

function onWindowResize() {
  rndrr.setResolution();
  rndrr.render();
}

function updatePosition() {
  offset = lastP[1] - anchorP[1];
  if( offset < mnOff ) offset = mnOff;
  if( offset > mxOff ) offset = mxOff;

  msh.vertices[0][1] = mn[1] + offset;

  rndrr.buff();
  rndrr.render();
}

function onMouseDown( event ) {
  pointerDown = true;

  event.preventDefault();

  var l = new lzr.ln();
  l.weight = 16;
  l.rgba = [0.0, 1.0, 1.0, 0.7]
  l.vertices.push( vec2.clone(anchorP) );

  anchorP[0] = rndrr.px2gl( event.clientX );
  anchorP[1] = rndrr.px2gl( event.clientY );

  console.log("down: ", anchorP);

  vec2.copy(rng.center, anchorP);

  l.vertices.push( vec2.clone(anchorP) );
  rndrr.mshs.push( l );

  rndrr.buff();
  rndrr.render();
}

function onMouseMove( event ) {
  if (pointerDown) {
    lastP[0] = rndrr.px2gl( event.clientX );
    lastP[1] = rndrr.px2gl( event.clientY );

    vec2.copy(rng.center, lastP);

    updatePosition();
  }
}

function onMouseUp( event ) {
  pointerDown = false;
}
