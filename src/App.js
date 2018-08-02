import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import ReactTable from 'react-table';
import 'react-table/react-table.css';
import checkboxHOC from "react-table/lib/hoc/selectTable";
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

const CheckboxTable = checkboxHOC(ReactTable);

class App extends Component {
  constructor() {
    super();

    const columns = [
      {
        Header: 'Image', accessor: 'img_src', maxWidth: 130,
        Cell: row => (<img className="App-Article-img" src={row.value} alt="Article" />)
      },
      { Header: 'Title', accessor: 'title' },
      { Header: 'Price', accessor: 'price', maxWidth: 100 },
      {
        Header: 'Link', accessor: 'link', maxWidth: 60,
        Cell: row => (<button onClick={() => window.open(row.value, "_blank")}>Open</button>)
      }
    ];

    this.state = {
      columns,
      selection: [],
      selectAll: false
    }
  }

  componentDidMount() {
    this.listArticles();
  }

  listArticles(list_marked = true) {
    // Get all ids on the server.
    fetch('http://localhost:8080/marked_ids', {
      "headers": {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      "method": "GET"
    }).then((response) => response.json())
      .then((marked_ids_obj) => {
        const marked_ids = marked_ids_obj.map(id_obj => id_obj['id']);

        fetch('./feed.json')
          .then(response => response.json())
          .then(data => {
            const unmarked_articles = data
              .filter(item => {
                const id = item['_id'];

                return !marked_ids.includes(id);
              });

            const marked_articles = data
              .filter(item => {
                const id = item['_id'];

                return marked_ids.includes(id);
              });

            this.setState({ unmarked_articles, marked_articles });
          })
          .catch(error => console.log(error));
      });
  }

  toggleSelection = (key, shift, row) => {
    // start off with the existing state
    let selection = [...this.state.selection];
    const keyIndex = selection.indexOf(key);
    // check to see if the key exists
    if (keyIndex >= 0) {
      // it does exist so we will remove it using destructing
      selection = [
        ...selection.slice(0, keyIndex),
        ...selection.slice(keyIndex + 1)
      ];
    } else {
      // it does not exist so add it
      selection.push(key);
    }
    // update the state
    this.setState({ selection });
  };

  toggleAll = () => {
    const selectAll = this.state.selectAll ? false : true;
    const selection = [];
    if (selectAll) {
      // we need to get at the internals of ReactTable
      const wrappedInstance = this.checkboxTable.getWrappedInstance();
      // the 'sortedData' property contains the currently accessible records based on the filter and sort
      const currentRecords = wrappedInstance.getResolvedState().sortedData;
      // we just push all the IDs onto the selection array
      currentRecords.forEach(item => {
        selection.push(item._original._id);
      });
    }
    this.setState({ selectAll, selection });
  };

  isSelected = key => {
    return this.state.selection.includes(key);
  };

  markRead = () => {
    this.state.selection.forEach(id => {
      const body = JSON.stringify({ id });

      fetch('http://localhost:8080/marked_ids', {
        "body": body,
        "headers": {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Charset": "UTF-8"
        },
        "method": "POST"
      })
        .then((response) => this.listArticles())
        .catch((reason) => console.error(reason));
    });
  };

  unmarkRead = () => {
    console.log("unmarked");
  };

  render() {
    const { toggleSelection, toggleAll, isSelected, markRead, unmarkRead } = this;
    const { columns, unmarked_articles, marked_articles, selectAll } = this.state;

    const checkboxProps = {
      selectAll,
      isSelected,
      toggleSelection,
      toggleAll,
      selectType: "checkbox",
      getTrProps: (s, r) => {
        const selected = r && this.isSelected(r.original._id);
        return {
          style: {
            backgroundColor: selected ? "lightgreen" : "inherit"
          }
        };
      }
    };

    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Viewer</h1>
        </header>

        <Tabs>
          <TabList>
            <Tab>Unmarked</Tab>
            <Tab>Marked</Tab>
          </TabList>

          <TabPanel>
            <button onClick={markRead}>Mark Read</button>

            {this.state &&
              <CheckboxTable
                ref={r => (this.checkboxTable = r)}
                data={unmarked_articles}
                columns={columns}
                defaultPageSize={10}
                className="-striped -highlight"
                {...checkboxProps}
              />
            }
          </TabPanel>
          <TabPanel>
            <button onClick={unmarkRead}>Unmark Read</button>

            {this.state &&
              <CheckboxTable
                ref={r => (this.checkboxTable = r)}
                data={marked_articles}
                columns={columns}
                defaultPageSize={10}
                className="-striped -highlight"
                {...checkboxProps}
              />
            }
          </TabPanel>
        </Tabs>
      </div>
    );
  }
}

export default App;
