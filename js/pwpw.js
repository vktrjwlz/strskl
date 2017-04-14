var rndrr;

var pointerDown = false;
var anchorP = vec2.fromValues(128.0, 128.0);
var lastP = vec2.create();

var errng = null;

function pwpw() {
  var cnvs = document.getElementById("lzrcnvs");
  rndrr = new lzr.rndrr(cnvs);

  rndrr.zoom = vec2.fromValues(20.0, 20.0);
  rndrr.setResolution();

  console.log("creating earring");

  // create earring
  errng = new strskl.errng();

  errng.generate();

  for (var i = 0; i < errng.lns.length; i++)
    rndrr.mshs.push(errng.lns[i]);

  for (var i = 0; i < errng.skls.length; i++) {
    var vrt = vec2.clone(errng.skls[i].tp);
    vec2.add(vrt, vrt, errng.mn);
    vec2.add(vrt, vrt, errng.orgn);
    var r = new lzr.rng();
    r.rgba = [0.0, 1.0, 0.0, 0.5]; // greenish
    r.center = vrt;
    r.radius = 1.0;
    r.weight = 0.2;
    r.segments = 16;
    rndrr.mshs.push(r);
  }

  var c = new lzr.rng();
  var vrt = vec2.clone(errng.orgn);
  vec2.add(vrt, vrt, errng.mn);
  c.rgba = [0.0, 0.0, 1.0, 0.5]; // blueish
  c.center = vrt;
  c.radius = errng.cntr_rad;
  c.weight = 0.4;
  c.segments = 32;
  rndrr.mshs.push(c);

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
