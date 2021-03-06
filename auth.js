const validate = require('jsonschema').validate
const util = require('./util')

var userSchemaLogin = {
    properties: {
        email: {
            type: 'string',
            required: true
        },
        password: {
            type: 'string',
            required: true
        }
    }
}

var userSchemaRegister = {
    properties: {
        name: {
            type: 'string',
            required: true
        },
        password: {
            type: 'string',
            required: true
        },
        email: {
            type: 'string',
            required: true
        }
    }
}


module.exports = function (server, router) {

    function addAuthorization(server, entity) {

        function authMiddleware_GET_PUT_DELETE(req, res, next) {
            var obj = router.db.get(entity).find(['id', parseInt(req.params.id)]).value()
            if (!obj)
                util.sendError(res, 400, util.Error.ERR_BAD_REQUEST, 'Object does not exists')
            else if (obj.userId !== req.session.userId)
                util.sendError(res, 400, util.Error.ERR_BAD_REQUEST, 'You don\'t have permissions to acces this object')
            else
                next()
        }

        function authMiddleware_POST(req, res, next) {
            req.body.userId = req.session.userId
            next()
        }

        function authMiddleware_GET_Collection(req, res, next) {
            req.query.userId = req.session.userId.toString()
            next()
        }

        server.get('/' + entity + '/:id', util.isAuthenticated, authMiddleware_GET_PUT_DELETE);
        server.put('/' + entity + '/:id', util.isAuthenticated, authMiddleware_GET_PUT_DELETE);
        server.delete('/' + entity + '/:id', util.isAuthenticated, authMiddleware_GET_PUT_DELETE);
        server.post('/' + entity, util.isAuthenticated, authMiddleware_POST)
        server.get('/' + entity, util.isAuthenticated, authMiddleware_GET_Collection)
    }

    // Call this function for each entity that has ownership wrt users
    //addAuthorization(server, 'orders')

    server.post('/users/login', util.isNotAuthenticated, function (req, res) {
        var v = validate(req.body, userSchemaLogin)

        if (!v.valid)
            util.sendError(res, 400, util.Error.ERR_BAD_REQUEST, util.jsonSchemaError(v))
        else {
            var user = router.db.get('users').find(['email', req.body.email]).value()
            if (user) {
                if (user.id === req.session.userId)
                    util.sendError(res, 400, util.Error.ERR_BAD_REQUEST, 'User already authenticated')
                else if (user.password === req.body.password) {
                    req.session.userId = user.id
                    req.session.email = user.email
                    util.jsonResponse(res, user)
                } else
                    util.sendError(res, 400, util.Error.ERR_BAD_REQUEST, 'Password do not match')
            } else
                util.jsonResponse(res, 'User <' + req.body.email + '> does not exists')
        }
    })

    server.post('/users/logout', util.isAuthenticated, function (req, res) {
        delete req.session['userId']
        delete req.session['email']
        util.jsonResponse(res, 'User logged out successfully')
    })

    server.post('/users', util.isNotAuthenticated, function (req, res) {
        var v = validate(req.body, userSchemaRegister)
        if (!v.valid)
            util.sendError(res, 400, util.Error.ERR_BAD_REQUEST, util.jsonSchemaError(v))
        else {
            router.db
                .get('users')
                .insert({
                    name: req.body.name,
                    email: req.body.email,
                    password: req.body.password,
                    user_type: req.user_type,
                    user_last_connection: req.user_last_connection,
                    registration_code: req.registration_code,
                    active: req.active,
                    udg_code: req.udg_code,
                    createdAt: req.createdAt,
                    updatedAt: req.updatedAt
                })
                .write()
            util.jsonResponse(res, 'User created successfully')
        }
    })

    server.get('/users/self', util.isAuthenticated, function (req, res) {
        var user = router.db.get('users').find(['id', req.session.userId]).value()
        util.jsonResponse(res, user)
    })

    server.get('/participacions/alumne', util.isAuthenticated, function (req, res) {
        var participacions = router.db.get('participacions').find(['usuari_id', req.session.userId]).value()
        util.jsonResponse(res, participacions)
    });

    server.get('/participacions/professor', util.isAuthenticated, function (req, res) {
        var cursos = [];
        var participacions = router.db.get('curs_professor').find(['usuari_id', req.session.userId]).value()
        if (participacions && participacions.length > 0){
            for (var i = 0; i< participacions.length; i++){
                var curs = router.db.get('cursos').find(['id', participacions[i]["curs_id"]]).value()
                cursos.push(curs);
            };
        }
        util.jsonResponse(res, cursos)
    });

    server.get('/professors', util.isAuthenticated, function (req, res) {
        var user = router.db.get('users').find(['user_type', "2"]).value()
        util.jsonResponse(res, user)
    });


}
