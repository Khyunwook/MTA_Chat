/*
 * mta.shell.js
 * shell module for MTA
*/

/*jslint         browser : true, continue : true,
  devel  : true, indent  : 2,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true
*/
/*global $, mta */
mta.shell = (function (){
	'use strict';
	//----------------모듈 스코프 변수 시작-----------------------
	var
		configMap = {
            anchor_schema_map : {
                chat : { opened : true, closed : true }
            },
			main_html : String()
			+'<div class ="mta-shell-head">'
		      +'<div class = "mta-shell-head-logo">'
                    +'<h1>MTA</h1>'
                    +'<p>My Talk App</p>'
              +'</div>'
		      +'<div class = "mta-shell-head-acct"></div>'
		      +'<div class = "mta-shell-head-option">＃</div>'
		    +'</div>'
		    +'<div class="mta-shell-main">'
		      +'<div class= "mta-shell-main-nav"></div>'
		      +'<div class= "mta-shell-main-content"></div>'
		    +'</div>'
		},
		stateMap ={ anchor_map : {}},
        jqueryMap = {},

        copyAnchorMap,   setJqueryMap,    changeAnchorPart,
        onHashchange,
        onTapAcct,       onLogin,         onLogout,
        setChatAnchor, initModule
        ;
	//----------------모듈 스코프 변수 끝-----------------------

	//---------------유틸리티 메서드 시작------------------------
    //저장된 앵커 맵의 복사본을 반환한다. 이를 통해 연산 부담을 최소화한다.
    copyAnchorMap = function(){
        return $.extend( true, {}, stateMap.anchor_map );
    }
	//---------------유틸리티 메서드 끝-------------------------

	//----------------DOM메서드 시작---------------------------
		// DOM 메서드 /setJqueryMap/ 시작
		setJqueryMap = function (){
			var $container = stateMap.$container;
			jqueryMap = {
                $container : $container,
                $acct      : $container.find('.mta-shell-head-acct'),
                $nav       : $container.find('.mta-shell-main-nav')
            };
		};
		// DOM 메서드 /setJqueryMap/ 끝

		//DOM 메서드/changeAnchorPart/ 끝
        changeAnchorPart=function(arg_map){
            var
                anchor_map_revise = copyAnchorMap(),
                bool_return = true,
                key_name, key_name_dep;

            //변경 사항을 앵커 맵으로 합치는 작업 시작
            KEYVAL:
                for(key_name in arg_map){
                    if(arg_map.hasOwnProperty(key_name)){
                        //반복 과정 중 의존적 키는 건너뜀
                        if(key_name.indexOf('_')===0){continue KEYVAL;}

                        //독립적 키 값을 업데이트
                        anchor_map_revise[key_name] = arg_map[key_name];

                        //대응되는 의존적 키를 업데이트
                        key_name_dep ='_'+key_name;
                        if(arg_map[key_name_dep]){
                            anchor_map_revise[key_name_dep] = arg_map[key_name_dep];
                        }
                        else{
                            delete anchor_map_revise[key_name_dep];
                            delete anchor_map_revise['_s'+key_name_dep];
                        }
                    }
                }
            //앵커 맵으로 변경 사항 병합 작업 끝

            //URI 업데이트를 시도. 작업이 성공하지 못하면 원래대로 복원
            try{
                $.uriAnchor.setAnchor(anchor_map_revise);
            }catch(error){
                //URI를 기존 상태로 대체
                $.uriAnchor.setAnchor(stateMap.anchor_map, null,true);
                bool_return = false;
            }

            //URI 업데이트 시도 끝
            return bool_return;
        };
        //DOM 메서드/changeAnchorPart/ 끝

    //----------------DOM메서드 끝-----------------------------

	//----------------이벤트 핸들러 시작-------------------------
    //이벤트 핸들러 /onHashchange/ 시작
    onHashchange = function(event){
        var
            anchor_map_previous = copyAnchorMap(),
            anchor_map_proposed,
            _s_chat_previous, _s_chat_proposed,
            s_chat_proposed,
            is_ok = true;

        //앵커 파싱을 시도
        try{anchor_map_proposed=$.uriAnchor.makeAnchorMap();}
        catch(error){
            $.uriAnchor.setAnchor(anchor_map_previous, null, true);
            return false;
        }
        stateMap.anchor_map = anchor_map_proposed;

        //편의 변수
        _s_chat_previous = anchor_map_previous._s_chat;
        _s_chat_proposed = anchor_map_proposed._s_chat;

        //변경된 경우 채팅 컴포넌트 조정을 시작
        if(!anchor_map_previous ||_s_chat_previous !==_s_chat_proposed){
            s_chat_proposed=anchor_map_proposed.chat;
            switch(s_chat_proposed){
                case 'opened' :
                    is_ok = mta.chat.setSliderPosition('opened');
                    break;
                case 'closed':
                    is_ok = mta.chat.setSliderPosition('closed');
                    break;
                default:
                    mta.chat.setSliderPosition('closed');
                    delete anchor_map_proposed.chat;
                    $.uriAnchor.setAnchor(anchor_map_proposed, null, true);
            }
        }
        //변경된 경우 채팅 컴포넌트 조정 끝
        //슬라이더 변경이 거부된 경우 앵커 복원 시작
        if(!is_ok){
            if(anchor_map_previous){
                $.uriAnchor.setAnchor(anchor_map_previous, null, true);
                stateMap.anchor_map = anchor_map_previous;
            }else{
                delete anchor_map_proposed.chat;
                $.uriAnchor.setAnchor(anchor_map_proposed, null, true);
            }
        }
        //슬라이더 변경이 거부된 경우 앵커 복원 끝
        return false;
    };
    //이벤트 핸들러 /onHashchange/ 끝

    //이벤트 핸들러 /onTapAcct/ 시작
    onTapAcct = function ( event ) {
        var acct_text, user_name, user = mta.model.people.get_user();
        if( user.get_is_anon() ){
            user_name = prompt( 'Please Login');
            mta.model.people.login(user_name);
            jqueryMap.$acct.text('...processing...');
        }
        else {
            mta.model.people.logout();
        }
        return false;
    };
    //이벤트 핸들러 /onTapAcct/ 끝
    onLogin = function ( event, login_user ){
        jqueryMap.$acct.text( login_user.name );
    };
    onLogout = function ( event, logout_user ){
        jqueryMap.$acct.text('Please Login');
    };


    //----------------이벤트 핸들러 끝---------------------------
    setChatAnchor = function ( postition_type){
        return changeAnchorPart( { chat : postition_type } );
    };
	//-----------------public 메서드 시작------------------------
    //public 메서드 /initModule/ 시작
    initModule = function ( $container ){
        stateMap.$container = $container;
        $container.html( configMap.main_html );
        setJqueryMap();

        $.uriAnchor.configModule({
            schema_map : configMap.anchor_schema_map
        });

        mta.chat.configModule( {
            set_chat_anchor : setChatAnchor,
            chat_model      : mta.model.chat,
            people_model    : mta.model.people
        } );
        mta.chat.initModule( $container );

        mta.avtr.configModule({
            chat_model : mta.model.chat,
            people_model : mta.model.people
        });
        mta.avtr.initModule(jqueryMap.$nav);
        // URI 앵커 변경 이벤트를 처리.
        // 이 작업은 모든 기능 모듈이 설정 및 초기화된 후에 수행한다.
        // 이렇게 하지 않으면 페이지 로드 시점에 앵커를 판단하는 데 사용되는
        // 트리거 이벤트를 모듈에서 처리할 수 없게 된다.
        $( window )
            .bind( 'hashchange', onHashchange )
            .trigger( 'hashchange' );

        $.gevent.subscribe( $container, 'mta-login', onLogin );
        $.gevent.subscribe( $container, 'mta-logout', onLogout );

        jqueryMap.$acct
            .text( 'Please Login')
            .bind( 'utap', onTapAcct );

    };
	//public 메서드 /initModule/ 끝

		return { initModule : initModule };
	//-----------------public 메서드 끝-------------------------
}());