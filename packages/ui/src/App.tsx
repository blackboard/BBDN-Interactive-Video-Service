import React from 'react';
import { createHashHistory } from 'history'
import { applyMiddleware, createStore, compose } from 'redux'
import { Provider } from 'react-redux'
import { Route, Switch } from 'react-router'
import { ConnectedRouter, routerMiddleware } from 'connected-react-router'
import { createRootReducer } from './RootReducer'
import { createMeetingMiddleware } from './meeting-creator/middleware';
import CreateMeetPage from './CreateMeetPage';
import ErrorPage from './ErrorPage';
import { localizedComponentWrapper } from 'react-babelfish';
import moment from 'moment';
import 'moment/min/locales.min';
import { initializeIcons } from 'office-ui-fabric-react';
import { parameters } from './util/parameters';
import queryString from 'query-string';
import MeetCreatedPage from './MeetCreatedPage';

moment.locale(navigator.language);

initializeIcons();

const hist = createHashHistory();

const store = createStore(
  createRootReducer(hist),
  compose(
    applyMiddleware(
      routerMiddleware(hist),
      createMeetingMiddleware()
    )
  )
);

const queryParams = queryString.parse(location.search);
const nonce = queryParams?.nonce;
let params = parameters.getInstance();
params.setNonce(nonce as string);

const returnUrl = queryParams?.returnurl;
params.setReturnUrl(returnUrl as string);

const courseName = queryParams?.cname;
params.setCourseName(decodeURIComponent(courseName as string));

function App() {
  return (
    <Provider store={store}>
      <ConnectedRouter history={hist}>
        <Switch>
          <Route exact path="/createMeet" component={CreateMeetPage} />
          <Route exact path="/finalizeMeet" component={MeetCreatedPage} />
          <Route exact path="/error" component={ErrorPage} />
          <Route component={CreateMeetPage} />
        </Switch>
      </ConnectedRouter>
    </Provider>
  );
}

export default localizedComponentWrapper(App);
