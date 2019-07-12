const Workspace = window.Workspace || {};
Workspace.load = (Cesium) => {

    const compact = (func) => (...args) => func(...args);
    const llh2m = (origin, target) => {
        const lat1 = origin.lat;
        const lon1 = origin.lng;

        const lat2 = target.lat;
        const lon2 = target.lng;

        var φ1 = Cesium.Math.toRadians(lat1), φ2 = Cesium.Math.toRadians(lat2), Δλ = Cesium.Math.toRadians(lon2-lon1), R = 6371e3; // gives d in metres
        var d = Math.acos( Math.sin(φ1)*Math.sin(φ2) + Math.cos(φ1)*Math.cos(φ2) * Math.cos(Δλ) ) * R;
        const height = target.height - origin.height
        return {
            latlng: d,
            height,
            distance: Math.sqrt(d * d + height * height)
        }
    }

    
    compact((wp, myCesium, util)=>{
        
        const calcPlaneView = (fromLLH, toLLH) => {
            
            var origin = new myCesium.Cartesian3.fromDegrees(fromLLH.lng, fromLLH.lat, fromLLH.height);
            var target = new myCesium.Cartesian3.fromDegrees(toLLH.lng, toLLH.lat, toLLH.height);
            
            var direction = myCesium.Cartesian3.subtract(target, origin, new myCesium.Cartesian3());
            const dibak = myCesium.Cartesian3.clone(direction);
            myCesium.Cartesian3.normalize(direction, direction);
            var rotationMatrix = myCesium.Transforms.rotationMatrixFromPositionVelocity(origin, direction);
            const orientation = myCesium.Quaternion.fromRotationMatrix(
                rotationMatrix
            )
    
            var position = myCesium.Cartesian3.fromDegrees(fromLLH.lng, fromLLH.lat, fromLLH.height, myellipsoid);
    
            return {
                position,
                orientation,
                direction: dibak,
                origin,
                target
            }
        }
        const PLANE_SPEED = 1000; // m/s
        
    
        class Plane {
            constructor(url, viewer, start, end) {
                this._start = start;
                this._end = end;
                this._viewer = viewer;
                this._url = url;
    
                this.addToViewer();
                this._currentTime = new Date().getTime();
                this._currentPosition = start;
            }
    
            addToViewer() {
                const fromLLH = this._start;
                const toLLH = this._end;
                const url = this._url;
                this._viewer.entities.removeAll();

                const {position, orientation, direction, origin, target} = calcPlaneView(fromLLH, toLLH);
    
                var entity2 = this._viewer.entities.add({
                    name: url,
                    position: position,
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
    
                // const hpr = myCesium.HeadingPitchRoll.fromQuaternion(orientation);
                // // const cameraOr = myCesium.Transforms.headingPitchRollQuaternion(target, hpr);
                // console.log(hpr);
                // this._viewer.camera.setView({
                //         destination: myCesium.Cartesian3.subtract(origin, direction, new myCesium.Cartesian3()),
                //         orientation: {
                //             heading: -degtorad(-myCesium.Math.toDegrees(hpr.heading) + 75),
                //             pitch: hpr.pitch,
                //             roll: 0
                //         }
                //     });
                this.updateView(origin, orientation, direction)
            }

            updateView(position, orientation, stepback) {
                if (this._isFollowPlane) {
                    const hpr = myCesium.HeadingPitchRoll.fromQuaternion(orientation);
                    // const cameraOr = myCesium.Transforms.headingPitchRollQuaternion(target, hpr);
                    // console.log(hpr);
                    this._viewer.camera.setView({
                            destination: myCesium.Cartesian3.subtract(position, stepback, new myCesium.Cartesian3()),
                            orientation: {
                                heading: -degtorad(-myCesium.Math.toDegrees(hpr.heading) + 75),
                                pitch: hpr.pitch,
                                roll: 0
                            }
                        });
                } else {
                    this._viewer.zoomTo(this._viewer.entities);
                }
            }

            update() {
                const currentTime = new Date().getTime();
                // console.log(`FPS: ${1000/(currentTime - this._currentTime)}`);
                const moveDistance = PLANE_SPEED/1000 * (currentTime - this._currentTime);
                this._currentTime = currentTime;

                // console.log(`MOVE DIS: ${moveDistance} m`);

                const currentSpace = llh2m(this._currentPosition, this._end);

                if (currentSpace.distance <= moveDistance) {
                    return;
                }

                const moveHeight = moveDistance/currentSpace.distance * currentSpace.height;

                // console.log(currentSpace, moveHeight);

                const moveLatLng = moveDistance/currentSpace.distance * currentSpace.latlng;
                const moveLat = moveLatLng/currentSpace.latlng * (this._end.lat - this._currentPosition.lat);
                const moveLng = moveLatLng/currentSpace.latlng * (this._end.lng - this._currentPosition.lng);

                this._currentPosition = {
                    lat: this._currentPosition.lat + moveLat,
                    lng: this._currentPosition.lng + moveLng,
                    height: this._currentPosition.height + moveHeight
                }

                const {position, orientation, origin, direction} = calcPlaneView(this._currentPosition, this._end);
                this._entity.position = position;
                this._entity.orientation = orientation;
                
                this.updateView(origin, orientation, direction)
            }

            setStartEnd(start, end) {
                this._start = start,
                this._end = end;
                this._currentPosition = start;
                this.addToViewer();
            }

            setCameraFollow(isFollow) {
                this._isFollowPlane = isFollow;
            }
        }
    
        wp.Plane = Plane;
    
    })(Workspace || {}, Cesium, {})
    
    
    
    compact((wp, myCesium, util)=>{
    
        const createPlane = (url, viewer, origin, target) => {
            const plane = new wp.Plane(url, viewer, origin, target);
            return plane;
        }    
        wp.createPlane = createPlane;
    
    })(Workspace || {}, Cesium, {})
}