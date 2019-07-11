const Workspace = window.Workspace || {};
Workspace.load = (Cesium) => {

    const compact = (func) => (...args) => func(...args);
    
    compact((wp, myCesium, util)=>{
    
        class Plane {
            constructor(url, viewer, start, end) {
                this._start = start;
                this._end = end;
                this._viewer = viewer;
    
                this.addToViewer(url);
            }
    
            addToViewer(url) {
                const fromLLH = this._start;
                const toLLH = this._end;
    
                var origin = new myCesium.Cartesian3.fromDegrees(fromLLH.lng, fromLLH.lat, fromLLH.height);
                var target = new myCesium.Cartesian3.fromDegrees(toLLH.lng, toLLH.lat, toLLH.height);
                
                var direction = myCesium.Cartesian3.subtract(target, origin, new myCesium.Cartesian3());
                const dibak = myCesium.Cartesian3.clone(direction);
                myCesium.Cartesian3.normalize(direction, direction);
                var rotationMatrix = myCesium.Transforms.rotationMatrixFromPositionVelocity(origin, direction);
                const orientation = myCesium.Quaternion.fromRotationMatrix(
                    rotationMatrix
                )
    
                var position2 = myCesium.Cartesian3.fromDegrees(fromLLH.lng, fromLLH.lat, fromLLH.height, myellipsoid);
                var entity2 = this._viewer.entities.add({
                    name: url,
                    position: position2,
                    orientation: orientation,
                    model: {
                        uri: url,
                        minimumPixelSize: 200,
                        maximumScale: 200000
                    }
                });
                //entity2.model.castShadows = true;
                //entity2.model.receiveShadows = false;
                //myviewer.trackedEntity = entity2;
                this._entity = entity2;
    
                this._viewer.entities.add({
                    position: origin,
                    point : {
                        color: myCesium.Color.GREENYELLOW,
                        pixelSize: 20,
                        outlineColor: myCesium.Color.WHITE,
                        outlineWidth: 2
                    },
                    label: {
                        text: 'Origin',
                        pixelOffset: { x: 0, y: 20 },
                        verticalOrigin: myCesium.VerticalOrigin.TOP
                    }
                });
    
                this._viewer.entities.add({
                    position: target,
                    point : {
                        color: myCesium.Color.GREENYELLOW,
                        pixelSize: 20,
                        outlineColor: myCesium.Color.WHITE,
                        outlineWidth: 2
                    },
                    label: {
                        text: 'Target',
                        pixelOffset: { x: 0, y: 20 },
                        verticalOrigin: myCesium.VerticalOrigin.TOP
                    }
                });
    
                const hpr = myCesium.HeadingPitchRoll.fromQuaternion(orientation);
                // const cameraOr = myCesium.Transforms.headingPitchRollQuaternion(target, hpr);
                console.log(hpr);
                this._viewer.camera.setView({
                        destination: myCesium.Cartesian3.subtract(origin, dibak, new myCesium.Cartesian3()),
                        orientation: {
                            heading: -degtorad(-myCesium.Math.toDegrees(hpr.heading) + 75),
                            pitch: hpr.pitch,
                            roll: 0
                        }
                    });
            }
        }
    
        wp.Plane = Plane;
    
    })(Workspace || {}, Cesium, {})
    
    
    
    compact((wp, myCesium, util)=>{
    
        const start = (url, viewer, origin, target) => {
            const plane = new wp.Plane(url, viewer, origin, target);
            return plane;
        }
    
        wp.start = start;
    
    })(Workspace || {}, Cesium, {})
}