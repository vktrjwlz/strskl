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

  errng.mxattmpts = 100000; // num times to attempt to generate vertices
  errng.mx_slc = 0.5;
  errng.mx_iskt = Math.PI / 1.8; // max intersect angle between tip rays

  errng.strt = 0.6; // width of struts

  errng.mndst = 1.5; // min distance between vertices
  errng.mn_tp = 1.0;

  errng.mn_ry = 2.0;

  errng.skls = null;
  errng.pn = null;
}

strskl.errng.prototype = {

  constructor: strskl.errng,

  // generate a new strskl earring
  generate: function() {
    var errng = this;

    console.log("generating earring");

    // generate skls with random rad & angl & attempt to add
    errng.skls = [];
    attmpts = 0;
    while (attmpts < errng.mxattmpts) {
      attmpts++;
      var rad = (Math.random() * (errng.skl_rad - (3.0 * errng.strt)))
                + errng.cntr_rad + (3.0 * errng.strt);
      var angl = Math.random() * Math.PI * 2.0;
      var skl = new strskl.skl(angl, rad);

      errng._add_skl(skl);
    }
    console.log("generated " + errng.skls.length + " skls in " + attmpts + " attempts");

    // clean up center skls
    errng._snip_cntr();

    // generate lines from skls for debugging
    errng._viz_skls();

    // build pn from skls
    errng._gen_pn();
  },

  // build pn from skls
  _gen_pn: function () {
    var errng = this;

    var orgn = vec2.create();
    vec2.add(orgn, errng.mn, errng.orgn); // get center of hoop

    console.log("origin " + orgn);

    errng.pn = new lzr.pn();

    // skls to be processed
    var skls = errng.skls.slice();

    // remove center skls
    skls.sort(strskl.skl.cmp_rad); // sort skls by radius
    var fskl = skls.shift(); // remove min rad skale
    var nxtskl = errng.skls[fskl.rt_rnt];
    var x = 0;
    while (x < errng.skls.length && nxtskl !== fskl) {
      x++;

      // remove nxtskl from skls
      var dx = skls.indexOf(nxtskl);
      if (dx >= 0) skls.splice(dx, 1);

      // set nxtskl to right parent
      nxtskl = errng.skls[nxtskl.rt_rnt];
    }

    // generate boundary
    var bndry = errng.pn.bndry;
    fskl = skls[skls.length - 1]; // start with largest radius skl
    errng.fskl = fskl;
    var v = vec2.create();
    vec2.add(v, orgn, fskl.tp);
    bndry.vrts.push(vec2.clone(v)); // add first tip to boundary
    var lstskl = fskl;
    var nxtdx = errng._nxt_skl(lstskl, false);
    if (nxtdx < 0) {
      console.log("ERROR: failed to find next skl for boundary");
      return false;
    }
    nxtskl = errng.skls[nxtdx];
    x = 0;
    while (x < errng.skls.length && nxtskl !== fskl) {
      x++;

      // add intermediate point
      if (lstskl.rt_rnt === nxtdx) {
        vec2.add(v, orgn, lstskl.rt_vrt);
        bndry.vrts.push(vec2.clone(v));
      } else {
        vec2.add(v, orgn, nxtskl.lft_vrt);
        bndry.vrts.push(vec2.clone(v));
      }

      // add tip
      vec2.add(v, orgn, nxtskl.tp);
      bndry.vrts.push(vec2.clone(v));

      // find next skl
      lstskl = nxtskl;
      nxtdx = errng._nxt_skl(lstskl, false);
      if (nxtdx < 0) {
        console.log("ERROR: failed to find next skl for boundary");
        return false;
      }
      nxtskl = errng.skls[nxtdx];
    }

    // add last intermediate point
    if (lstskl.rt_rnt === nxtdx) {
      vec2.add(v, orgn, lstskl.rt_vrt);
      bndry.vrts.push(vec2.clone(v));
    } else {
      vec2.add(v, orgn, nxtskl.lft_vrt);
      bndry.vrts.push(vec2.clone(v));
    }

    // offset boundary loop
    bndry.offset(errng.strt * 0.5);

    // generate voids
    // skls = [skls[0]]; // TODO remove this test setup
    while (skls.length > 0) {
      var skl = skls.pop();
      errng.fskl = skl;
      var endskl = errng.skls[skl.lft_rnt];
      var vd = new lzr.lp();

      // add first vrts from skl
      vec2.add(v, orgn, skl.lft_vrt);
      vd.vrts.push(vec2.clone(v));
      vec2.add(v, orgn, skl.tp);
      vd.vrts.push(vec2.clone(v));
      vec2.add(v, orgn, skl.rt_vrt);
      vd.vrts.push(vec2.clone(v));

      // find next sibling on right side
      var rntskl = errng.skls[skl.rt_rnt];
      var sibskl = errng._nxt_sib_skl(skl, false);
      if (sibskl === rntskl) {
        vec2.add(v, orgn, rntskl.lft_vrt);
        vd.vrts.push(vec2.clone(v));
        nxtskl = errng.skls[rntskl.lft_rnt];
      } else {
        vec2.add(v, orgn, sibskl.rt_vrt);
        vd.vrts.push(vec2.clone(v));
        nxtskl = sibskl;
      }

      // loop over left parents until end skl is reached
      x = 0;
      // while (x < errng.skls.length && nxtskl !== endskl) {
      while (x < 0 && nxtskl !== endskl) {
        x++;

        // add nxtskls tip
        vec2.add(v, orgn, nxtskl.tp);
        vd.vrts.push(vec2.clone(v));

        // check for kids
        mndx = errng._nxt_skl(nxtskl, true);
        if (mndx < 0) {
          console.log("ERROR: failed to find next skl for void");
          return false;
        }
        if (mndx === nxtskl.lft_rnt) {
          vec2.add(v, orgn, nxtskl.lft_vrt);
          vd.vrts.push(vec2.clone(v));
          nxtskl = errng.skls[nxtskl.lft_rnt];
        } else {
          nxtskl = errng.skls[mndx];
          vec2.add(v, orgn, nxtskl.rt_vrt);
          vd.vrts.push(vec2.clone(v));
        }
      }

      // offset boundary void and add to pn voids
      vd.offset(errng.strt * -0.5);
      errng.pn.vds.push(vd);
    }
    return true;
  },

  //
  _nxt_sib_skl: function (skl, lft) {
    var errng = this;

    var rntdx;
    if (lft) rntdx = skl.lft_rnt;
    else rntdx = skl.rt_rnt;
    var rntskl = errng.skls[rntdx];

    var kds = errng._skl_kds(rntskl, !lft);

    var skldst;
    if (lft) skldst = vec2.dist(rntskl.tp, skl.lft_vrt);
    else skldst = vec2.dist(rntskl.tp, skl.rt_vrt);

    var mnskl = null;
    var mndst;
    if (lft) mndst = vec2.dist(rntskl.tp, rntskl.rt_vrt);
    else mndst = vec2.dist(rntskl.tp, rntskl.lft_vrt);

    // find closest sibling past this scale
    for (var i = 0; i < kds.length; i++) {
      var kd = kds[i];
      if (kd !== skl) {
        var dst;
        if (lft) dst = vec2.dist(rntskl.tp, kd.lft_vrt);
        else dst = vec2.dist(rntskl.tp, kd.rt_vrt);

        if (dst < mndst && dst > skldst) {
          mndst = dst;
          mnskl = kd;
        }
      }

    }

    if (mnskl === null) return rntskl;
    return mnskl;
  },

  // find next closest rt & lft vrts for skl
  _nxt_skl: function (skl, lft) {
    var errng = this;

    var dx = errng.skls.indexOf(skl);
    if (dx < 0) return -1;

    // find skls that are kids of given skl
    var kddxs = [];
    for (var i = 0; i < errng.skls.length; i++) {
      if (lft && errng.skls[i].rt_rnt === dx) {
        kddxs.push(i);
      }
      if (!lft && errng.skls[i].lft_rnt === dx) {
        kddxs.push(i);
      }
    }

    // if skl has no kids on given side return parent
    if (kddxs.length < 1) {
      if (lft) return skl.lft_rnt;
      else return skl.rt_rnt;
    }

    // otherwise find kid skl with vrt closest to given skl tip
    var mndx = kddxs[0];
    var mnskl = errng.skls[mndx];
    var mndst;
    if (lft) mndst = vec2.dist(skl.tp, mnskl.rt_vrt);
    else mndst = vec2.dist(skl.tp, mnskl.lft_vrt);
    for (var i = 1; i < kddxs.length; i++) {
      var kddx = kddxs[i];
      var kdskl = errng.skls[kddx];
      var dst;
      if (lft) dst = vec2.dist(skl.tp, kdskl.rt_vrt);
      else dst = vec2.dist(skl.tp, kdskl.lft_vrt);
      if (dst < mndst) {
        mndst = dst;
        mndx = kddx;
        mnskl = kdskl;
      }
    }
    return mndx;
  },

  _skl_kds: function (skl, lft) {
    var errng = this;
    var kds = [];

    var dx = errng.skls.indexOf(skl);
    if (dx < 0) {
      console.log("ERROR: cant get kids - skl not in errng");
      return kds;
    }

    for (var i = 0; i < errng.skls.length; i++) {
      var kdskl = errng.skls[i];

      if (lft && kdskl.rt_rnt === dx) kds.push(kdskl);
      if (!lft && kdskl.lft_rnt === dx) kds.push(kdskl);
    }

    return kds;
  },

  // clean up center skls
  _snip_cntr: function () {
    var errng = this;

    console.log("snipping center");

    // make list of skls with null lft or rt parents
    var nlskls = [];
    for (var i = 0; i < errng.skls.length; i++) {
      var skl = errng.skls[i];
      if (skl.lft_rnt < 0 || skl.rt_rnt < 0) nlskls.push(skl);
    }

    // process skls from null list
    while (nlskls.length > 0) {
      var nlskl = nlskls.pop();
      var nldx = errng.skls.indexOf(nlskl);
      if (nldx >= 0) {

        // find skls with this skl as parent
        var lftkds = [], rtkds = [];
        for (var i = 0; i < errng.skls.length; i++) {
          var skl = errng.skls[i];
          if (skl.lft_rnt === nldx) rtkds.push(skl);
          if (skl.rt_rnt === nldx) lftkds.push(skl);
        }

        // if this skl has root ray with no kids delete it
        if ((nlskl.lft_rnt < 0 && lftkds.length === 0)
            || (nlskl.rt_rnt < 0 && rtkds.length === 0)) {

          // remove from errng skls list
          errng.skls.splice(nldx, 1);

          // add kd skls to nlskl list
          for (var i = 0; i < lftkds.length; i++) {
            var skl = lftkds[i];
            skl.rt_rnt = -1;
            if (nlskls.indexOf(skl) < 0) nlskls.push(skl);
          }
          for (var i = 0; i < rtkds.length; i++) {
            var skl = rtkds[i];
            skl.lft_rnt = -1;
            if (nlskls.indexOf(skl) < 0) nlskls.push(skl);
          }

          // if parent index is greater than deleted index reduce it by 1
          for (var i = 0; i < errng.skls.length; i++) {
            var skl = errng.skls[i];
            if (skl.lft_rnt > nldx) skl.lft_rnt--;
            if (skl.rt_rnt > nldx) skl.rt_rnt--;
          }

        // otherwise snip to furthest kid
        } else {
          if (nlskl.lft_rnt < 0) {
            var mxkd = lftkds[0];
            var mxdst = vec2.dist(nlskl.tp, mxkd.rt_vrt);
            for (var i = 1; i < lftkds.length; i++) {
              var dst = vec2.dist(nlskl.tp, lftkds[i].rt_vrt);
              if (dst > mxdst) {
                mxdst = dst;
                mxkd = lftkds[i];
              }
            }
            vec2.copy(nlskl.lft_vrt, mxkd.rt_vrt);
            nlskl.lft_rnt = errng.skls.indexOf(mxkd);
          }
          if (nlskl.rt_rnt < 0) {
            var mxkd = rtkds[0];
            var mxdst = vec2.dist(nlskl.tp, mxkd.lft_vrt);
            for (var i = 1; i < rtkds.length; i++) {
              var dst = vec2.dist(nlskl.tp, rtkds[i].lft_vrt);
              if (dst > mxdst) {
                mxdst = dst;
                mxkd = rtkds[i];
              }
            }
            vec2.copy(nlskl.rt_vrt, mxkd.lft_vrt);
            nlskl.rt_rnt = errng.skls.indexOf(mxkd);
          }
        }
      }
    }
  },

  // generate lines from skls for debugging
  _viz_skls: function () {
    var errng = this;

    var orgn = vec2.create();
    vec2.add(orgn, errng.mn, errng.orgn); // get center of hoop

    console.log("origin " + orgn);

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

    // if skl is under min distance from others fail
    // if skl is covered fail
    for (var i = 0; i < errng.skls.length; i++) {
      var dst = vec2.dist(skl.tp, errng.skls[i].tp);
      if (dst < errng.mndst) {
        return false;
      }
      if (errng.skls[i].covers(skl)) {
        // console.log("$$$ " + errng.skls[i].toString() + " covers " + skl.toString() + " :/");
        return false;
      }
    }

    // find skl to intersect with
    var mnlftdst = skl.rad * 2.0;
    var mnlftvrt = null;
    var mnlftdx = -1;
    var mnrtdst = skl.rad * 2.0;
    var mnrtvrt = null;
    var mnrtdx = -1;
    for (var i = 0; i < errng.skls.length; i++) {
      var oskl = errng.skls[i];
      var ivrt = vec2.create();
      var iskt = oskl.intersects(skl, ivrt);

      // if intersection test was successful check if it is closest
      if (iskt !== 0) {
        var dst = vec2.dist(ivrt, skl.tp);
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

    // if length of new ray is less than min dont add
    var lftlngth = vec2.dist(skl.tp, skl.lft_vrt);
    var rtlngth = vec2.dist(skl.tp, skl.rt_vrt);
    if (lftlngth < errng.mn_ry || rtlngth < errng.mn_ry) {
      // console.log("cant add new skl: ray too short");
      return false;
    }

    // if angle of intersection is greater than max dont add
    var lftangl = errng._skl_rnt_angle(skl, true);
    var rtangl = errng._skl_rnt_angle(skl, false);
    if ((lftangl + skl.swp > errng.mx_iskt) || (rtangl + skl.swp > errng.mx_iskt)) {
      // console.log("cant intersect: angle between scales too large");
      return false;
    }

    // if ray is too close to another skl tip dont add
    for (var i = 0; i < errng.skls.length; i++) {
      var oskl = errng.skls[i];

      var angl = skl.angle_to_skl(oskl);
      if (angl < skl.swp) {
        var otp = oskl.tp;
        var lftry = lzr.sg.from_end(skl.tp, skl.lft_vrt);
        var rtry = lzr.sg.from_end(skl.tp, skl.rt_vrt);

        var lftpvrt = vec2.create();
        var rtpvrt = vec2.create();
        lzr.sg.project(lftpvrt, lftry, otp);
        lzr.sg.project(rtpvrt, rtry, otp);
        lps = [
          vec2.dist(lftpvrt, skl.tp),
          vec2.dist(lftpvrt, skl.lft_vrt),
          vec2.dist(skl.tp, skl.lft_vrt)
        ];
        rps = [
          vec2.dist(rtpvrt, skl.tp),
          vec2.dist(rtpvrt, skl.rt_vrt),
          vec2.dist(skl.tp, skl.rt_vrt)
        ];

        var lftdst = lzr.sg.mn_dst(lftry, otp);
        var rtdst = lzr.sg.mn_dst(rtry, otp);
        if (lftdst < errng.mn_tp || rtdst < errng.mn_tp) {
          return false;
        }
      }
    }

    errng.skls.push(skl);
    return true;
  },

  _skl_rnt_angle: function (skl, lft) {
    var errng = this;

    // pick rnt & vrt
    var vrt = skl.lft_vrt;
    var rnt = skl.lft_rnt;
    if (!lft) {
      vrt = skl.rt_vrt;
      rnt = skl.rt_rnt;
    }

    // if rnt & vrt arent set fail
    if (vrt === null || rnt < 0) return -1;

    // get parent skl
    var rntskl = errng.skls[rnt];
    return skl.angle_to_skl(rntskl);
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

  skl.mn_ry = 2.0;
  skl.swp = 1.0; // angle swept between vertices at tip

  skl.angl = angl;
  skl.rad = rad;

  rtmt = mat2.create();

  skl.tp = vec2.fromValues(skl.rad, 0);
  mat2.fromRotation(rtmt, skl.angl);
  vec2.transformMat2(skl.tp, skl.tp, rtmt);

  skl.lft_vrt = null;
  skl.rt_vrt = null;
  skl.lft_rnt = -1;
  skl.rt_rnt = -1;
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

  // calculate angle from center to tip between skls
  angle_to_skl: function (oskl) {
    var skl = this;

    var sg = lzr.sg.from_end(vec2.fromValues(0, 0), skl.tp);
    return lzr.sg.angle_to(sg, oskl.tp);
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
  intersects: function (oskl, ivrt) { // 1 -> left, 0 -> not, -1 -> right
    var skl = this;

    // console.log("testing if " + oskl + " intersects " + skl);

    if (skl.lft_vrt === null || skl.rt_vrt === null) {
      console.log("ERROR: attempted to intersect with unset skl");
      return 0;
    }

    var osg = lzr.sg.from_end(vec2.fromValues(0, 0), skl.tp);
    var lft = lzr.sg.is_left(osg, oskl.tp);
    var angl = lzr.sg.angle_to(osg, oskl.tp);

    // console.log("angle betweeen scales: " + angl.toFixed(2) + " left: " + lft);

    // if angle between skls is less than epsilon return 0
    if (angl < lzr.EPSILON) return 0;

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

    // console.log("*intersecting " + lzr.sg.str(tsg) + " and " + lzr.sg.str(otsg));

    // find point where other sg intersects with this sg
    lzr.sg.intersect(ivrt, otsg, tsg);

    // console.log("***intersection point: " + lzr.v2.str(ivrt));

    // find t of intersection point
    var tplngth = vec2.dist(ivrt, skl.tp);
    var ndlngth = vec2.dist(ivrt, nd);
    var rylngth = lzr.sg.mag(tsg);
    var t = tplngth / rylngth;

    // ts.push(t); // push t value of intersection point

    // console.log("tplngth: " + tplngth.toFixed(2)
    //   + " ndlngth: " + ndlngth.toFixed(2)
    //   + " rylngth: " + rylngth.toFixed(2));
    // console.log("******intersects at t: " + t.toFixed(2));

    if (tplngth > rylngth || ndlngth > rylngth) {
      // console.log("******intersection is outside of segment");
      return 0;
    }

    // return 1 for left or -1 for right
    if (lft) return 1;
    return -1;
  }
}
strskl.skl.cmp_rad = function (a, b) {
  return a.rad - b.rad;
};
strskl.skl.cmp_angl = function (a, b) {
  return a.angl - b.angl;
};
