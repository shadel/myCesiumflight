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
            
            var origin = new myCesium.Cartesian3.fromDegrees(fromLLH.lng, fromLLH.lat, fromLLH.height, myellipsoid);
            var target = new myCesium.Cartesian3.fromDegrees(toLLH.lng, toLLH.lat, toLLH.height, myellipsoid);
            
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
                target,
                rotationMatrix
            }
        }
        const PLANE_SPEED = 1000; // m/s
        
    
        class Plane {
            constructor(url, viewer, start, end) {
                this._start = start;
                this._end = end;
                this._viewer = viewer;
                this._url = url;
                this._isFollowPlane = true;
    
                this.addToViewer();
                this._currentTime = new Date().getTime();
                this._currentPosition = new myCesium.Cartesian3.fromDegrees(start.lng, start.lat, start.height, myellipsoid);
            }
    
            addToViewer() {
                const fromLLH = this._start;
                const toLLH = this._end;
                const url = this._url;
                this._viewer.entities.removeAll();

                const {position, orientation, direction, origin, target, rotationMatrix} = calcPlaneView(fromLLH, toLLH);
    
                var entity2 = this._viewer.entities.add({
                    name: url,
                    position: position,
                    orientation: orientation,
                    model: {
                        uri: url,
                        minimumPixelSize: 200,
                        maximumScale: 200000
                    },
                    viewFrom: new myCesium.Cartesian3(-30, 0, 10),
                });
                //entity2.model.castShadows = true;
                //entity2.model.receiveShadows = false;
                //myviewer.trackedEntity = entity2;
                this._entity = entity2;
    
                this._viewer.entities.add({
                    position: new myCesium.Cartesian3.fromDegrees(fromLLH.lng, fromLLH.lat, 0),
                    cylinder : {
                        length: fromLLH.height,                                   
                        topRadius: 10.0,
                        bottomRadius: 10.0,
                        outline: false,
                        outlineColor: Cesium.Color.BLUE,
                        outlineWidth: 4,
                        material: new Cesium.ColorMaterialProperty(Cesium.Color.BLUE),
                        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                    },
                    label: {
                        text: 'Origin',
                        pixelOffset: { x: 0, y: 20 },
                        verticalOrigin: myCesium.VerticalOrigin.TOP
                    }
                });
    
                this._viewer.entities.add({
                    position: new myCesium.Cartesian3.fromDegrees(toLLH.lng, toLLH.lat, 0),
                    cylinder : {
                        length: toLLH.height,                                   
                        topRadius: 10.0,
                        bottomRadius: 10.0,
                        outline: false,
                        outlineColor: Cesium.Color.BLUE,
                        outlineWidth: 4,
                        material: new Cesium.ColorMaterialProperty(Cesium.Color.BLUE),
                        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
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
                this.updateView(origin, orientation, direction, rotationMatrix, target)
            }

            renderView(position, orientation, stepback, rotationMatrix, target) {
                if (this._isFollowPlane) {
                    const hpr = myCesium.HeadingPitchRoll.fromQuaternion(orientation);
                    // const cameraOr = myCesium.Transforms.headingPitchRollQuaternion(target, hpr);
                    const direction = myCesium.Cartesian3.clone(stepback);
                    // console.log(hpr);
                    Cesium.Cartesian3.multiplyByScalar(myCesium.Cartesian3.normalize(stepback, stepback), 30, stepback);

                    const origin = myCesium.Cartesian3.subtract(position, stepback, new myCesium.Cartesian3());
                    
                    var rotationMatrix = myCesium.Transforms.rotationMatrixFromPositionVelocity(origin, myCesium.Cartesian3.normalize(stepback, stepback));
                    const v_orientation = myCesium.Quaternion.fromRotationMatrix(
                        rotationMatrix
                    )

                    // this._viewer.camera.setView({
                    //         destination: origin,//myCesium.Cartesian3.subtract(position, stepback, new myCesium.Cartesian3()),
                    //         orientation: 
                    //         {
                    //             // direction: new Cesium.Cartesian3(Cesium.Math.toRadians(90),Cesium.Math.toRadians(-180),Cesium.Math.toRadians(90)),//direction,
                    //             // up: new Cesium.Cartesian3(0,0,0)
                    //             heading: Cesium.Math.toRadians(135),
                    //             pitch: Cesium.Math.toRadians(0),
                    //             roll: Cesium.Math.toRadians(0)                            
                    //         }
                    //     });
                    // console.log(this._line);
                    // this._line = this._viewer.entities.add({
                    //     position: origin,
                    //     point : {
                    //         color: Cesium.Color.YELLOW
                    //     },
                    // });
                    // console.log(this._line);
                    // const heading= -degtorad(-myCesium.Math.toDegrees(hpr.heading) + 75);
                    // const pitch= hpr.pitch;
                    const range = 100;
                    const heading= Cesium.Math.toRadians(135);
                    const pitch= Cesium.Math.toRadians(0);
                    this._viewer.camera.lookAt(position, new Cesium.HeadingPitchRange(heading, pitch, range));
                    // const direction=  myCesium.Cartesian3.normalize(stepback, stepback);
                    // this._entity.viewFrom = new myCesium.Cartesian3(-30, 0, 10);
                    // this._viewer.trackedEntity = this._entity;
                    // console.log("this._entity.viewFrom", this._entity.viewFrom._value);
                    // this._viewer.zoomTo(this._entity);
                } else {
                    this._viewer.zoomTo(this._viewer.entities);
                }
            }

            updateView(position, orientation, stepback, rotationMatrix, target) {
                if (this._isFollowPlane) {
                    const hpr = myCesium.HeadingPitchRoll.fromQuaternion(orientation);
                    // const cameraOr = myCesium.Transforms.headingPitchRollQuaternion(target, hpr);
                    const direction = myCesium.Cartesian3.clone(stepback);
                    // console.log(hpr);
                    Cesium.Cartesian3.multiplyByScalar(myCesium.Cartesian3.normalize(stepback, stepback), 200, stepback);

                    const origin = myCesium.Cartesian3.subtract(position, stepback, new myCesium.Cartesian3());
                    // console.log("origin, position", myCesium.Cartesian3.distance(origin, position));
                    // console.log("origin, target", myCesium.Cartesian3.distance(origin, target));
                    // console.log("position, target", myCesium.Cartesian3.distance(position, target));
                    
                    // var rotationMatrix = myCesium.Transforms.rotationMatrixFromPositionVelocity(origin, myCesium.Cartesian3.normalize(stepback, stepback));
                    // const v_orientation = myCesium.Quaternion.fromRotationMatrix(
                    //     rotationMatrix
                    // )

                    // this._viewer.camera.setView({
                    //         destination: origin,//myCesium.Cartesian3.subtract(position, stepback, new myCesium.Cartesian3()),
                    //         orientation: 
                    //         {
                    //             direction: direction,
                    //             up: new Cesium.Cartesian3(0,0,0)
                    //             // heading: -degtorad(myCesium.Math.toDegrees(hpr.heading) + 0),
                    //             // pitch: hpr.pitch,
                    //             // roll: hpr.roll                            
                    //         }
                    //     });
                    
                    // this._viewer.camera.setView({
                    //     destination: origin,
                    //     orientation: 
                    //     {
                    //         // direction: new Cesium.Cartesian3(Cesium.Math.toRadians(90),Cesium.Math.toRadians(-180),Cesium.Math.toRadians(90)),//direction,
                    //         // up: new Cesium.Cartesian3(0,0,0)
                    //         heading: Cesium.Math.toRadians(135),
                    //         pitch: Cesium.Math.toRadians(0),
                    //         roll: Cesium.Math.toRadians(0)                            
                    //     }
                    // });
                    // console.log(this._line);
                    // this._line = this._viewer.entities.add({
                    //     position: origin,
                    //     point : {
                    //         color: Cesium.Color.RED
                    //     },
                    // });
                    // console.log(this._line);
                    // const heading= -degtorad(-myCesium.Math.toDegrees(hpr.heading) + 75);
                    // const pitch= hpr.pitch;
                    // const range = 100;
                    // this._viewer.camera.lookAt(position, new Cesium.HeadingPitchRange(Cesium.Math.toRadians(135), 1, 1));
                    
                    const range = 100;
                    const heading= Cesium.Math.toRadians(0);
                    const pitch= Cesium.Math.toRadians(0);
                    this._viewer.zoomTo(this._entity, new Cesium.HeadingPitchRange(heading, pitch, range));
                    // const direction=  myCesium.Cartesian3.normalize(stepback, stepback);
                    // this._entity.viewFrom = new myCesium.Cartesian3(-30, 0, 10);
                    // this._viewer.trackedEntity = this._entity;
                    // console.log("this._entity.viewFrom", this._entity.viewFrom._value);
                    // this._viewer.zoomTo(this._entity);
                } else {
                    this._viewer.zoomTo(this._viewer.entities);
                }
            }

            update() {
                const currentTime = new Date().getTime();
                // console.log(`FPS: ${1000/(currentTime - this._currentTime)}`);
                const moveDistance = PLANE_SPEED/1000 * (currentTime - this._currentTime);
                this._currentTime = currentTime;

                console.log(`MOVE DIS: ${moveDistance} m`);
                const target = myCesium.Cartesian3.fromDegrees(this._end.lng, this._end.lat, this._end.height);

                const distance = myCesium.Cartesian3.distance(target, this._currentPosition);

                if (distance <= moveDistance) {
                    return;
                }
                
                var direction = myCesium.Cartesian3.subtract(target, this._currentPosition, new myCesium.Cartesian3());
                const unitDirection = myCesium.Cartesian3.normalize(direction, new myCesium.Cartesian3());
                const newPos = myCesium.Cartesian3.add(
                    this._currentPosition, 
                    myCesium.Cartesian3.multiplyByScalar(unitDirection, moveDistance, new myCesium.Cartesian3()), 
                    new myCesium.Cartesian3()
                    )
                this._currentPosition = newPos;
                
                var direction = myCesium.Cartesian3.subtract(target, this._currentPosition, new myCesium.Cartesian3());
                const dibak = myCesium.Cartesian3.clone(direction);
                myCesium.Cartesian3.normalize(direction, direction);
                var rotationMatrix = myCesium.Transforms.rotationMatrixFromPositionVelocity(this._currentPosition, direction);
                const orientation = myCesium.Quaternion.fromRotationMatrix(
                    rotationMatrix
                )

                this._entity.position = newPos;
                this._entity.orientation = orientation;
                
             this.updateView(newPos, orientation, dibak, rotationMatrix, target)
            }

            update_v1() {
                const currentTime = new Date().getTime();
                // console.log(`FPS: ${1000/(currentTime - this._currentTime)}`);
                const moveDistance = PLANE_SPEED/1000 * (currentTime - this._currentTime);
                this._currentTime = currentTime;

                console.log(`MOVE DIS: ${moveDistance} m`);

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

                const {position, orientation, origin, direction, rotationMatrix, target} = calcPlaneView(this._currentPosition, this._end);
                this._entity.position = position;
                this._entity.orientation = orientation;
                
             this.updateView(origin, orientation, direction, rotationMatrix, target)
            }

            setStartEnd(start, end) {
                this._start = start,
                this._end = end;
                this._currentPosition =  new myCesium.Cartesian3.fromDegrees(start.lng, start.lat, start.height, myellipsoid);;
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