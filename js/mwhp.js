var mwhp = {}; // init lzr namespace

mwhp.errng = function () {
  var errng = this;
  errng.mn = vec2.fromValues(2, 2); // min screen coord of bounds
  errng.sz = vec2.fromValues(70, 70);
  errng.mmsz = vec2.fromValues(70, 70); // millimeter size of bounds

  errng.orgn = vec2.fromValues(39, 35); // screen size of bounds
  errng.rad = 30.0;

  // errng.wide_thrsh = Math.PI / 1.5;

  errng.mxattmpts = 1000; // num times to attempt to generate vertices
  errng.cll = 0.4; // ratio of generated vertices to cull
  errng.hp_cll = 0.1;
  errng.mndst = 5; // min distance between vertices
  errng.strt = 0.6; // width of struts
  errng.mn_split_brdth = errng.strt * 3.0; // min breadth to split triangle

  errng.hkvrts = [vec2.fromValues(8, 38), vec2.fromValues(8, 32)];
  errng.hkx = [
    vec2.fromValues(6, 33),
    vec2.fromValues(5, 35),
    vec2.fromValues(6, 37)];
  errng.hkvd = [ // will be offset by strut width
    vec2.fromValues(8, 34),
    vec2.fromValues(6.5, 33.5),
    vec2.fromValues(5, 35),
    vec2.fromValues(6.5, 36.5),
    vec2.fromValues(8, 36)];

  errng.hp = null;
  errng.dlny = null;
  errng.pn = null;
}

mwhp.errng.prototype = {

  constructor: mwhp.errng,

  // generate a new mwhp earring
  generate: function() {
    var errng = this;

    console.log("generating earring");

    // generate random vertices for delaunay
    // create delaunay triangulation
    errng.dlny = new lzr.dlny();

    var rtmt = mat2.create();
    var orgn = vec2.create();
    vec2.add(orgn, errng.mn, errng.orgn); // get center of hoop

    console.log("hoop origin " + orgn);

    // add hook vertices (where hook will be anchored)
    var hkdxs = [];
    for (var i = 0; i < errng.hkvrts.length; i++) {
      hkdxs.push(errng.dlny.vrts.length);
      var vrt = vec2.clone(errng.hkvrts[i]);
      vec2.add(vrt, vrt, errng.mn); // add mn to hook vertices
      errng.dlny.vrts.push(vrt);
    }

    // generate points on hoop
    var attmpts = 0;
    var i = 0;
    while (attmpts < errng.mxattmpts) {
      attmpts++;

      // create vertex on hoop & rotate by random angle
      var vrt = vec2.fromValues(errng.rad, 0); // create vertex at angle 0
      var angl = Math.random() * Math.PI * 2.0;
      mat2.fromRotation(rtmt, angl);
      vec2.transformMat2(vrt, vrt, rtmt);

      // add to hoop origin
      vec2.add(vrt, vrt, orgn);

      // if space is free add to hoop vertices
      var clst = errng.dlny.get_closest(vrt);
      if (clst === null || vec2.dist(vrt, clst) > errng.mndst) {
        errng.dlny.vrts.push(vrt);
        i++;
      }
    }
    console.log("generated " + i + " hoop vertices in " + attmpts + " attempts");
    for (var j = 0; j < i * errng.hp_cll; j++) errng.dlny.vrts.pop();
    console.log("culled " + j + " hoop vertices");

    // generate points inside hoop
    attmpts = 0;
    i = 0;
    while (attmpts < errng.mxattmpts) {
      attmpts++;
      var vrt = vec2.fromValues((Math.random() * errng.rad) + errng.mn[0], 0);
      var angl = Math.random() * Math.PI * 2.0;
      mat2.fromRotation(rtmt, angl);
      vec2.transformMat2(vrt, vrt, rtmt);

      // add to hoop origin
      vec2.add(vrt, vrt, orgn);

      // console.log("generated possible interior point at " + vrt);

      // if space is free add to hoop vertices
      var clst = errng.dlny.get_closest(vrt);
      if (clst === null || vec2.dist(vrt, clst) > errng.mndst) {
        errng.dlny.vrts.push(vrt);
        i++;
      }
    }
    console.log("generated " + i + " interior vertices in " + attmpts + " attempts");
    for (var j = 0; j < i * errng.cll; j++) errng.dlny.vrts.pop();
    console.log("culled " + j + " interior vertices");

    // triangulate
    errng.dlny.triangulate();

    // prune edge triangles
    // errng.prune_edge_trngls(errng.wide_thrsh);
    // errng.prune_edge_trngls(errng.wide_thrsh);

    // generate boundary loop from triangle edges without adjacent triangles
    var edges = {}; // map from first vertex index to second vertex index
    for (var i = 0; i < errng.dlny.trngls.length; i++) {
      var trngl = errng.dlny.trngls[i];
      for (var j = 0; j < trngl.dxs.length; j++) {
        if (errng.dlny.get_adjacent(trngl, trngl.dxs[j]) === null) {
          var k = j + 1;
          if (k > 2) k = 0;
          var l = k + 1;
          if (l > 2) l = 0;
          edges[trngl.dxs[k]] = trngl.dxs[l];
        }
      }
    }

    // create earring panel
    errng.pn = new lzr.pn();

    // loop over edges (starting with first hook vrt dx) to generate boundary
    var fvdx = hkdxs[0];
    // var fvdx = 0; // first vertex is in hoop
    var nvdx = fvdx;
    errng.pn.bndry.vrts.push(vec2.clone(errng.dlny.vrts[nvdx]));

    while (nvdx in edges) {

      var bvdx = edges[nvdx];
      if (bvdx === fvdx) {
        console.log("closed boundary loop!");
        break;
      }
      errng.pn.bndry.vrts.push(vec2.clone(errng.dlny.vrts[bvdx]));

      delete edges[nvdx];
      nvdx = bvdx;
    }

    // add hook extension vertices
    for (var i = 0; i < errng.hkx.length; i++) {
      var vrt = vec2.clone(errng.hkx[i]);
      vec2.add(vrt, vrt, errng.mn);
      errng.pn.bndry.vrts.push(vrt);
    }

    // offset boundary loop
    errng.pn.bndry.offset(errng.strt * 0.5);

    // add hook void
    var hkvd = new lzr.lp();
    for (var i = 0; i < errng.hkvd.length; i++) {
      var vrt = vec2.clone(errng.hkvd[i]);
      vec2.add(vrt, vrt, errng.mn);
      hkvd.vrts.push(vrt);
    }
    // console.log("hook void before offset " + hkvd.vrts.join(" | "));
    hkvd.offset(errng.strt * -0.5);
    errng.pn.vds.push(hkvd);

    console.log("added hook void " + hkvd.vrts.join(" | "));

    console.log("adding earring voids");

    for (var i = 0; i < errng.dlny.trngls.length; i++) {

      var otrngl = errng.dlny.trngls[i].clone();

      var omnb = otrngl.mn_brdth();
      if (omnb > errng.mn_split_brdth) {
        var cntr = vec2.create();
        otrngl.get_center(cntr);
        otrngl.vrts.push(cntr);
        var mwtrngls = otrngl.split(3);

        for (var j = 0; j < mwtrngls.length; j++) {
          var omwtrngl = mwtrngls[j].offset(errng.strt * -0.5);
          var vd = new lzr.lp();
          vd.vrts = omwtrngl.vrts.slice();
          errng.pn.vds.push(vd);
        }
      } else if (omnb > errng.splt * 2) {

        otrngl = otrngl.offset(errng.strt * -0.5);
        var vd = new lzr.lp();
        vd.vrts = otrngl.vrts.slice();
        errng.pn.vds.push(vd);
      }
    }
  },

  prune_edge_trngls: function (mnangl) {
    var errng = this;

    var nwtrngls = [];
    for (var i = 0; i < errng.dlny.trngls.length; i++) {
      var trngl = errng.dlny.trngls[i];
      var edges = [];
      for (var j = 0; j < trngl.dxs.length; j++) {
        if (errng.dlny.get_adjacent(trngl, trngl.dxs[j]) === null) {
          edges.push(j);
        }
      }

      // prune triangles with one outside edge & wider than threshold
      if (edges.length === 1 && trngl.get_angle(edges[0]) > mnangl) {
        //console.log("pruning triangle " + trngl);

      } else {
        nwtrngls.push(trngl);
      }
    }
    console.log("pruned " + (errng.dlny.trngls.length - nwtrngls.length).toString() + " triangles");
    errng.dlny.trngls = nwtrngls;
  },

  dl_dxf: function () {
    var errng = this;

    var mx = vec2.fromValues(
      errng.mn[0] * 2.0 + errng.sz[0],
      errng.mn[1] * 2.0 + errng.sz[1]);

    var scl = vec2.fromValues(
      errng.mmsz[0] / errng.sz[0],
      errng.mmsz[1] / errng.sz[1]);

    // generate dxf
    var dxf = errng.pn.dxffy(mx, scl);

    // download it
    lzr.dl.txt(dxf);

  }
}
