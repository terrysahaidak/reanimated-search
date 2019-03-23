import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Text,
  View,
} from 'react-native';
import A, { Easing } from 'react-native-reanimated';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  product: {
    flex: 1,
    height: 150,
    marginVertical: 8,
    marginHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'gray',
  },
  header: {
    flex: 1,
    backgroundColor: '#34495e',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  inputContainer: {
    flex: 1,
    height: 52,
    position: 'absolute',
    justifyContent: 'center',
    bottom: 0,
    left: 0,
    right: 0,
  },
  input: {
    backgroundColor: 'white',
    height: 34,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  cancelButton: {
    position: 'absolute',
    right: 0,
  },
  cancel: {
    color: 'white',
  },
});

function Product() {
  return (
    <View style={styles.product}>
      <Text>Product</Text>
    </View>
  );
}

const list = Array(15)
  .fill(undefined)
  .map((_, index) => index);

function ProductList() {
  return list.map((item) => <Product key={item} />);
}

function runTiming(clock, value, dest, cb = () => 0) {
  const state = {
    finished: new A.Value(0),
    position: new A.Value(0),
    time: new A.Value(0),
    frameTime: new A.Value(0),
  };

  const config = {
    duration: 450,
    toValue: new A.Value(0),
    easing: Easing.inOut(Easing.poly(5)),
  };

  return A.block([
    A.cond(
      A.clockRunning(clock),
      [
        // if the clock is already running we update the toValue, in case a new dest has been passed in
        A.set(config.toValue, dest),
      ],
      [
        // if the clock isn't running we reset all the animation params and start the clock
        A.set(state.finished, 0),
        A.set(state.time, 0),
        A.set(state.position, value),
        A.set(state.frameTime, 0),
        A.set(config.toValue, dest),
        A.startClock(clock),
      ],
    ),
    // we run the step here that is going to update position
    A.timing(clock, state, config),
    // if the animation is over we stop the clock
    A.cond(state.finished, [cb(), A.stopClock(clock)]),
    // we made the block return the updated position
    state.position,
  ]);
}

const UNSET = -1;
const INIT = 0;
const FALSE = 0;
const TRUE = 1;

const BIG_HEADER_HEIGHT = 140;

const AnimatedTextInput = A.createAnimatedComponent(TextInput);

class Input extends React.Component {
  _inputRef = React.createRef();

  _inputClock = new A.Clock();
  _cancelClock = new A.Clock();
  _focusState = new A.Value(UNSET);

  _marginRight = A.cond(
    A.eq(this._focusState, TRUE),
    [runTiming(this._inputClock, 8, 84)],
    A.cond(
      A.eq(this._focusState, FALSE),
      [runTiming(this._inputClock, 84, 8)],
      8,
    ),
  );

  _translateX = A.cond(
    A.eq(this._focusState, TRUE),
    [runTiming(this._cancelClock, 100, -24)],
    A.cond(
      A.eq(this._focusState, FALSE),
      [runTiming(this._cancelClock, -24, 100)],
      100,
    ),
  );

  handleFocus() {
    this._focusState.setValue(TRUE);
    this.props.focusState.setValue(TRUE);
  }

  handleBlur(shouldBlur) {
    if (shouldBlur) {
      this._inputRef.current._component.blur();
    }

    this._focusState.setValue(FALSE);
    this.props.focusState.setValue(FALSE);
  }

  render() {
    return (
      <View style={styles.inputContainer}>
        <AnimatedTextInput
          ref={this._inputRef}
          onFocus={() => this.handleFocus()}
          onBlur={() => this.handleBlur()}
          style={[styles.input, { marginRight: this._marginRight }]}
        />
        <A.View
          style={[
            styles.cancelButton,
            { transform: [{ translateX: this._translateX }] },
          ]}
        >
          <TouchableOpacity onPress={() => this.handleBlur(true)}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
        </A.View>
      </View>
    );
  }
}

export default class App extends React.Component {
  _scrollRef = React.createRef();

  _paddingClock = new A.Clock();
  _heightClock = new A.Clock();

  _scrollX = new A.Value(INIT);

  _focusState = new A.Value(UNSET);
  _shouldAnimateForward = new A.Value(TRUE);
  _shouldAnimateBack = new A.Value(FALSE);

  _lastScroll = new A.Value(INIT);

  _getCurrentHeaderHeight = () =>
    A.sub(BIG_HEADER_HEIGHT, this._scrollX);

  _height = A.block([
    A.cond(
      A.and(
        A.eq(this._focusState, TRUE),
        A.greaterThan(this._getCurrentHeaderHeight(), 72),
      ),
      A.cond(
        A.eq(this._shouldAnimateForward, TRUE),
        [
          runTiming(
            this._heightClock,
            A.max(this._getCurrentHeaderHeight(), 72),
            72,
            () => [
              A.set(this._shouldAnimateForward, FALSE),
              A.set(this._shouldAnimateBack, TRUE),
              A.set(this._lastScroll, A.add(72, this._scrollX)),
            ],
          ),
        ],
        72,
      ),
      A.cond(
        A.and(
          A.eq(this._focusState, FALSE),
          A.eq(this._shouldAnimateBack, TRUE),
        ),
        [
          runTiming(
            this._heightClock,
            72,
            A.max(this._getCurrentHeaderHeight(), 72),
            () => [
              A.set(this._shouldAnimateForward, TRUE),
              A.set(this._shouldAnimateBack, FALSE),
              A.set(this._focusState, UNSET),
            ],
          ),
        ],
        A.max(this._getCurrentHeaderHeight(), 72),
      ),
    ),
  ]);

  _bigHeaderHeight = A.block([
    A.call([this._scrollX], ([value]) => {
      this.scrollPosition = value;
    }),
    A.cond(
      A.eq(this._focusState, UNSET),
      BIG_HEADER_HEIGHT,
      A.cond(
        A.clockRunning(this._heightClock),
        A.add(this._height, this._scrollX),
        this._lastScroll,
      ),
    ),
  ]);

  _event = A.event([
    {
      nativeEvent: {
        contentOffset: {
          y: this._scrollX,
        },
      },
    },
  ]);

  scrollTo(value) {
    global.requestAnimationFrame(() =>
      this._scrollRef.current._component.scrollTo(value),
    );
  }

  _onScrollEndDrag() {
    // FIXME: Use proper values
    // if (this.scrollPosition > 25 && this.scrollPosition <= 64) {
    //   this.scrollTo({ y: 72 });
    // }
  }

  render() {
    return (
      <View style={styles.container}>
        <A.ScrollView
          ref={this._scrollRef}
          onScroll={this._event}
          scrollEventThrottle={1}
          onScrollEndDrag={() => this._onScrollEndDrag()}
          style={{
            paddingTop: this._bigHeaderHeight,
          }}
        >
          <ProductList />
        </A.ScrollView>

        <A.View style={[styles.header, { height: this._height }]}>
          <Input focusState={this._focusState} />
        </A.View>
      </View>
    );
  }
}
