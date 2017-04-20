var strskl = {}; // init lzr namespace

strskl.errng = function () {
  var errng = this;
  errng.mn = vec2.fromValues(2, 2); // min screen coord of bounds
  errng.sz = vec2.fromValues(32, 32);
  errng.mmsz = vec2.fromValues(32, 32); // millimeter size of bounds

  errng.orgn = vec2.fromValues(16, 16); // screen size of bounds
  errng.cntr_rad = 4.0;
  errng.skl_rad = 8.0;

  // errng.wide_thrsh = Math.PI / 1.5;

  errng.mxattmpts = 1000; // num times to attempt to generate vertices
  errng.mx_slc = 0.5;

  errng.strt = 0.6; // width of struts

  errng.mndst = 2; // min distance between vertices

  errng.skls = null;
  errng.pn = null;
}

strskl.errng.prototype = {

  constructor: strskl.errng,

  // generate a new strskl earring
  generate: function() {
    var errng = this;

    console.log("generating earring");

    var rtmt = mat2.create();
    var orgn = vec2.create();
    vec2.add(orgn, errng.mn, errng.orgn); // get center of hoop

    console.log("origin " + orgn);

    // generate points inside hoop
    errng.skls = [];
    attmpts = 0;
    while (attmpts < errng.mxattmpts) {
      attmpts++;
      var rad = (Math.random() * (errng.skl_rad - (3.0 * errng.strt)))
                + errng.cntr_rad + (3.0 * errng.strt);
      var angl = Math.random() * Math.PI * 2.0;
      var skl = new strskl.skl(angl, rad);

      // try to add skl if its min distance from others
      var mndst = true;
      for (var i = 0; i < errng.skls.length; i++) {
        var dst = vec2.dist(skl.tp, errng.skls[i].tp);
        if (dst < errng.mndst) mndst = false;
      }
      if (mndst) errng._add_skl(skl);
    }
    console.log("generated " + errng.skls.length + " skls in " + attmpts + " attempts");

    // generate lines from skls for debugging
    errng.lns = [];

    for (var i = 0; i < errng.skls.length; i++) {
      var skl = errng.skls[i];

      var o = vec2.clone(skl.tp);
      var l = vec2.clone(skl.lft_vrt);
      var r = vec2.clone(skl.rt_vrt);

      vec2.add(o, o, orgn);
      vec2.add(l, l, orgn);
      vec2.add(r, r, orgn);

      var ln = new lzr.ln();
      ln.rgba = [0.7, 0.0, 0.0, 0.7]; // reddish
      ln.weight = 0.3;
      ln.vertices = [o, l];
      errng.lns.push(ln);

      ln = new lzr.ln();
      ln.rgba = [0.7, 0.0, 0.0, 0.7]; // reddish
      ln.weight = 0.3;
      ln.vertices = [o, r];
      errng.lns.push(ln);
    }
  },

  _add_skl: function (skl) {
    var errng = this;

    // if skl is covered fail
    for (var i = 0; i < errng.skls.length; i++) {
      if (errng.skls[i].covers(skl)) {
        console.log("$$$ " + errng.skls[i].toString() + " covers " + skl.toString() + " :/");
        return false;
      }
    }

    // find skl to intersect with
    var mnlftdst = skl.rad;
    var mnlftvrt = null;
    var mnlftdx = -1;
    var mnrtdst = skl.rad;
    var mnrtvrt = null;
    var mnrtdx = -1;
    for (var i = 0; i < errng.skls.length; i++) {
      var oskl = errng.skls[i];
      var ivrt = vec2.create();
      var ts = [];
      var iskt = oskl.intersects(skl, ivrt, ts);

      // if intersection test was successful check if it is closest
      if (iskt !== 0) {
        var dlta = vec2.create();
        vec2.sub(dlta, ivrt, skl.tp);
        var dst = vec2.length(dlta);
        if (iskt > 0) { // left
          if (dst < mnlftdst) {
            mnlftdst = dst;
            mnlftvrt = ivrt;
            mnlftdx = i;
          }
        } else { // right
          if (dst < mnrtdst) {
            mnrtdst = dst;
            mnrtvrt = ivrt;
            mnrtdx = i;
          }
        }
      }
    }

    // if min left or right index is less than 0 try to intersect
    // with min circle
    if (mnlftdx < 0) {
      mnlftvrt = vec2.create();
      if (!errng._intersect_cntr(skl, mnlftvrt, true)) return false;
      skl.lft_vrt = mnlftvrt;
    } else {
      skl.lft_vrt = mnlftvrt;
      skl.lft_rnt = mnlftdx;
    }
    if (mnrtdx < 0) {
      mnrtvrt = vec2.create();
      if (!errng._intersect_cntr(skl, mnrtvrt, false)) return false;
      skl.rt_vrt = mnrtvrt;
    } else {
      skl.rt_vrt = mnrtvrt;
      skl.rt_rnt = mnrtdx;
    }
    errng.skls.push(skl);
    return true;
  },

  // intersect skl ray with center min radius
  _intersect_cntr: function (skl, ivrt, lft) {
    var errng = this;

    // console.log("intersecting " + skl + " with cntr, left: " + lft);

    // generate left or right segment to intersect
    var o = vec2.fromValues(0, 0);
    var tsg = lzr.sg.from_end(skl.tp, o);
    var angl = skl.swp * 0.5;
    if (lft) angl = angl * -1.0;

    // console.log("rotating tip sg " + lzr.sg.str(tsg) + " by angle " + angl);

    lzr.sg.rotate(tsg, angl);

    // console.log("sg to intersect: " + lzr.sg.str(tsg));

    // calculate intersection point
    // http://stackoverflow.com/questions/1073336/circle-line-segment-collision-detection-algorithm
    var r = errng.cntr_rad;
    var d = vec2.create();
    lzr.sg.dlta(d, tsg);
    var f = vec2.clone(skl.tp);

    // console.log("d: " + d + " f: " + f);

    var a = vec2.dot(d, d);
    var b = 2 * vec2.dot(f, d);
    var c = vec2.dot(f, f) - (r * r);

    // console.log("a: " + a + " b: " + b + " c: " + c);

    var dscr = (b * b) - (4 * a * c);
    if (dscr < 0) {
      // console.log("doesnt intersect circle, discriminant less than 0: " + dscr);
      return false;
    }

    dscr = Math.sqrt(dscr);
    var t = (-b - dscr) / (2.0 * a);

    // console.log("t: " + t);

    vec2.scale(d, d, t);
    lzr.sg.set_dlta(tsg, d);

    // get point of intersection
    var iskt = vec2.create();
    lzr.sg.end(iskt, tsg);

    // console.log("*intersects at: " + iskt);

    // calculate slice of circle covered
    var osg = lzr.sg.from_end(o, skl.tp);
    var slc = lzr.sg.angle_to(osg, iskt);

    // console.log("slice covered: " + slc);

    if (slc > errng.mx_slc) return false;

    // console.log("***intersects circle within max slice!");
    vec2.copy(ivrt, iskt);
    return true;
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

strskl.skl = function (angl, rad) {
  var skl = this;

  skl.mx_iskt = Math.PI / 2.0; // max intersect angle between tip rays
  skl.swp = 1.0; // angle swept between vertices at tip

  skl.angl = angl;
  skl.rad = rad;

  rtmt = mat2.create();

  skl.tp = vec2.fromValues(skl.rad, 0);
  mat2.fromRotation(rtmt, skl.angl);
  vec2.transformMat2(skl.tp, skl.tp, rtmt);

  skl.lft_vrt = null;
  skl.rt_vrt = null;
  skl.lft_rnt = null;
  skl.rt_rnt = null;
}

strskl.skl.prototype = {

  constructor: strskl.skl,

  toString: function () {
    var skl = this;

    return "skl( angl: " + skl.angl.toFixed(2) + " rad: " + skl.rad.toFixed(2)
      + " tp: " + lzr.v2.str(skl.tp)
      + " vrts: " + [lzr.v2.str(skl.lft_vrt), lzr.v2.str(skl.rt_vrt)].join(" - ")
      + " rnts: " + [skl.lft_rnt, skl.rt_rnt].join(" - ") + ")";
  },

  // return true if this scale would cover tip of other scale
  covers: function (oskl) {
    var skl = this;

    // if other skls radius is larger doesnt cover
    if (oskl.rad > skl.rad) return false;

    // if angle from tip to to other point is more than half angle doesnt cover
    var tpsg = lzr.sg.from_end(skl.tp, vec2.fromValues(0, 0));

    var angl = lzr.sg.angle_to(tpsg, oskl.tp);
    if (angl > skl.swp * 0.5) return false;

    // if distance is greater than tip radius doesnt cover
    var tpdst = vec2.dist(skl.tp, oskl.tp);
    if (tpdst > skl.rad) return false;

    return true;
  },

  // return side intersected & intersection point
  // assumes oskl isnt covered by this skl
  intersects: function (oskl, ivrt, ts) { // 1 -> left, 0 -> not, -1 -> right
    var skl = this;

    console.log("testing if " + oskl + " intersects " + skl);

    if (skl.lft_vrt === null || skl.rt_vrt === null) {
      console.log("ERROR: attempted to intersect with unset skl");
      return 0;
    }

    var osg = lzr.sg.from_end(vec2.fromValues(0, 0), skl.tp);
    var lft = lzr.sg.is_left(osg, oskl.tp);
    var angl = lzr.sg.angle_to(osg, oskl.tp);

    console.log("angle betweeen scales: " + angl.toFixed(2) + " left: " + lft);

    // if angle between skls is less than epsilon return 0
    if (angl < lzr.EPSILON) return 0;

    // if angle of intersection is greater than max skls dont intersect
    if (angl + ((skl.swp + oskl.swp) * 0.5) > skl.mx_iskt) {
      console.log("cant intersect: angle between scales too large");
      return 0;
    }

    // get sgs to intersect from other skl and this skl
    var otsg = lzr.sg.from_end(oskl.tp, vec2.fromValues(0, 0));
    var nd;
    if (!lft) {
      lzr.sg.rotate(otsg, oskl.swp * 0.5);
      nd = skl.lft_vrt;
    } else {
      lzr.sg.rotate(otsg, oskl.swp * -0.5);
      nd = skl.rt_vrt;
    }
    var tsg = lzr.sg.from_end(skl.tp, nd);

    console.log("*intersecting " + lzr.sg.str(tsg) + " and " + lzr.sg.str(otsg));

    // find point where other sg intersects with this sg
    lzr.sg.intersect(ivrt, otsg, tsg);

    console.log("***intersection point: " + lzr.v2.str(ivrt));

    // find t of intersection point
    var tplngth = vec2.dist(ivrt, skl.tp);
    var ndlngth = vec2.dist(ivrt, nd);
    var rylngth = lzr.sg.mag(tsg);
    var t = tplngth / rylngth;

    ts.push(t); // push t value of intersection point

    console.log("tplngth: " + tplngth.toFixed(2)
      + " ndlngth: " + ndlngth.toFixed(2)
      + " rylngth: " + rylngth.toFixed(2));
    console.log("******intersects at t: " + t.toFixed(2));

    if (tplngth > rylngth || ndlngth > rylngth) {
      console.log("******intersection is outside of segment");
      return 0;
    }

    // return 1 for left or -1 for right
    if (lft) return 1;
    return -1;
  }
}
