import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Standard Helvetica fonts are built into react-pdf

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerText: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  titleBlock: {
    alignItems: 'center',
    marginBottom: 15,
  },
  mainTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    textDecoration: 'underline',
  },
  subTitle: {
    fontSize: 10,
  },
  itemBlock: {
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  boldLabel: {
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    marginRight: 4,
  },
  valueText: {
    flex: 1,
  },
  indentedBlock: {
    marginLeft: 15,
    marginBottom: 4,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000',
    marginTop: 4,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
  },
  tableColHeader: {
    borderRightWidth: 1,
    borderColor: '#000',
    padding: 3,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  tableCol: {
    borderRightWidth: 1,
    borderColor: '#000',
    padding: 3,
  },
  narrativeBlock: {
    marginTop: 5,
    marginBottom: 10,
    textAlign: 'justify',
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  signatureBlock: {
    width: '40%',
  },
  sealBlock: {
    marginTop: 20,
    alignItems: 'flex-end',
  }
});

export const FIRPdfDocument = ({ draft, officer }: { draft: any, officer: any }) => {
  const comp = draft.complainant || {};
  let occ = draft.occurrence || {};
  if (draft.timeline && draft.timeline.length > 0) {
    const firstEvent = draft.timeline[0];
    const lastEvent = draft.timeline[draft.timeline.length - 1];
    
    // Attempt to parse out distance/direction from location if it exists, otherwise leave blank
    occ = {
      date_from: firstEvent.date || '',
      time_from: firstEvent.time || '',
      date_to: lastEvent.date !== firstEvent.date ? lastEvent.date : '',
      time_to: lastEvent.time !== firstEvent.time ? lastEvent.time : '',
      location: firstEvent.location || '',
      distance_direction: 'N/A' // Not naturally extracted by timeline, requires officer input usually
    };
  }
  const accusedList = draft.accused || [];
  const propList = draft.property || [];
  const sections = draft.officer_confirmed_sections || [];

  const totalValue = propList.reduce((sum: number, p: any) => sum + (Number(p.estimated_value) || 0), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerRow}>
          <Text style={styles.headerText}>Book No. _________</Text>
          <Text style={styles.headerText}>Form No. 1</Text>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.mainTitle}>FIRST INFORMATION REPORT</Text>
          <Text style={styles.subTitle}>(Under Section 173 B.N.S.S.)</Text>
        </View>

        {/* Item 1 */}
        <View style={styles.itemBlock}>
          <View style={styles.row}>
            <Text style={styles.boldLabel}>1. District:</Text>
            <Text style={{ width: 120, borderBottomWidth: 1, borderColor: '#ccc', paddingBottom: 1 }}>{officer?.station_jurisdiction?.toUpperCase() || 'N/A'}</Text>
            <Text style={[styles.boldLabel, { marginLeft: 10 }]}>P.S.:</Text>
            <Text style={{ width: 120, borderBottomWidth: 1, borderColor: '#ccc', paddingBottom: 1 }}>{officer?.station_name?.toUpperCase() || 'N/A'}</Text>
            <Text style={[styles.boldLabel, { marginLeft: 10 }]}>Year:</Text>
            <Text style={{ flex: 1, borderBottomWidth: 1, borderColor: '#ccc', paddingBottom: 1 }}>{new Date().getFullYear()}</Text>
          </View>
          <View style={[styles.row, { marginTop: 6 }]}>
            <Text style={styles.boldLabel}>FIR No:</Text>
            <Text style={{ width: 120, borderBottomWidth: 1, borderColor: '#ccc', paddingBottom: 1 }}>{draft.id.split('-')[0].toUpperCase()}</Text>
            <Text style={[styles.boldLabel, { marginLeft: 10 }]}>Date:</Text>
            <Text style={{ flex: 1, borderBottomWidth: 1, borderColor: '#ccc', paddingBottom: 1 }}>{new Date().toLocaleDateString('en-IN')}</Text>
          </View>
        </View>

        {/* Item 2 */}
        <View style={styles.itemBlock}>
          <Text style={styles.boldLabel}>2. Acts & Sections</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={[styles.tableColHeader, { width: '15%' }]}><Text>S.No</Text></View>
              <View style={[styles.tableColHeader, { width: '45%' }]}><Text>Acts</Text></View>
              <View style={[styles.tableColHeader, { width: '40%', borderRightWidth: 0 }]}><Text>Sections</Text></View>
            </View>
            {sections.length > 0 ? sections.map((sec: any, idx: number) => (
              <View style={styles.tableRow} key={idx}>
                <View style={[styles.tableCol, { width: '15%' }]}><Text>{idx + 1}</Text></View>
                <View style={[styles.tableCol, { width: '45%' }]}><Text>{sec.title}</Text></View>
                <View style={[styles.tableCol, { width: '40%', borderRightWidth: 0 }]}><Text>{sec.code}</Text></View>
              </View>
            )) : (
              <View style={styles.tableRow}>
                <View style={[styles.tableCol, { width: '15%' }]}><Text>1</Text></View>
                <View style={[styles.tableCol, { width: '45%' }]}><Text>N/A</Text></View>
                <View style={[styles.tableCol, { width: '40%', borderRightWidth: 0 }]}><Text>N/A</Text></View>
              </View>
            )}
          </View>
        </View>

        {/* Item 3 */}
        <View style={styles.itemBlock}>
          <Text style={styles.boldLabel}>3. (a) Occurrence of offence:</Text>
          <View style={styles.indentedBlock}>
            <View style={styles.row}>
              <Text style={styles.boldLabel}>Date From:</Text>
              <Text style={{ width: 100 }}>{occ.date_from || 'N/A'}</Text>
              <Text style={styles.boldLabel}>Date To:</Text>
              <Text style={{ flex: 1 }}>{occ.date_from || 'N/A'}</Text>
            </View>
            <View style={[styles.row, { marginTop: 2 }]}>
              <Text style={styles.boldLabel}>Time From:</Text>
              <Text style={{ width: 100 }}>{occ.time_from ? occ.time_from + ' hrs' : 'N/A'}</Text>
              <Text style={styles.boldLabel}>Time To:</Text>
              <Text style={{ flex: 1 }}>{occ.time_from ? occ.time_from + ' hrs' : 'N/A'}</Text>
            </View>
          </View>

          <Text style={styles.boldLabel}>(b) Information received at P.S.:</Text>
          <View style={styles.indentedBlock}>
            <View style={styles.row}>
              <Text style={styles.boldLabel}>Date:</Text>
              <Text style={{ width: 100 }}>{new Date().toLocaleDateString('en-IN')}</Text>
              <Text style={styles.boldLabel}>Time:</Text>
              <Text style={{ flex: 1 }}>{new Date().toLocaleTimeString('en-IN')}</Text>
            </View>
          </View>

          <Text style={styles.boldLabel}>(c) General Diary Reference:</Text>
          <View style={styles.indentedBlock}>
            <View style={styles.row}>
              <Text style={styles.boldLabel}>Entry No:</Text>
              <Text style={{ width: 100 }}>001A</Text>
              <Text style={styles.boldLabel}>Time:</Text>
              <Text style={{ flex: 1 }}>{new Date().toLocaleTimeString('en-IN')}</Text>
            </View>
          </View>
        </View>

        {/* Item 4 */}
        <View style={styles.itemBlock}>
          <View style={styles.row}>
            <Text style={styles.boldLabel}>4. Type of Information:</Text>
            <Text style={styles.valueText}>Written</Text>
          </View>
        </View>

        {/* Item 5 */}
        <View style={styles.itemBlock}>
          <Text style={styles.boldLabel}>5. Place of Occurrence:</Text>
          <View style={styles.indentedBlock}>
            <View style={styles.row}>
              <Text style={styles.boldLabel}>(a) Direction and distance from P.S.:</Text>
              <Text style={styles.valueText}>{occ.distance_direction || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.boldLabel}>(b) Address:</Text>
              <Text style={styles.valueText}>{occ.location || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.boldLabel}>(c) In case, outside the limit of this Police Station:</Text>
              <Text style={styles.valueText}>N/A</Text>
            </View>
          </View>
        </View>

        {/* Item 6 */}
        <View style={styles.itemBlock}>
          <Text style={styles.boldLabel}>6. Complainant / Informant:</Text>
          <View style={styles.indentedBlock}>
            <View style={styles.row}><Text style={styles.boldLabel}>(a) Name:</Text><Text style={styles.valueText}>{comp.name?.toUpperCase() || 'N/A'}</Text></View>
            <View style={styles.row}><Text style={styles.boldLabel}>(b) Father's/Husband's Name:</Text><Text style={styles.valueText}>{(comp.father_name || comp.spouse_name)?.toUpperCase() || 'N/A'}</Text></View>
            <View style={styles.row}>
              <Text style={styles.boldLabel}>(c) Date/Year of Birth:</Text>
              <Text style={{ width: 100 }}>{comp.dob || comp.age || 'N/A'}</Text>
              <Text style={styles.boldLabel}>(d) Nationality:</Text>
              <Text style={styles.valueText}>INDIAN</Text>
            </View>
            <View style={styles.row}><Text style={styles.boldLabel}>(e) UID/ID Details:</Text><Text style={styles.valueText}>{comp.id_details?.toUpperCase() || 'N/A'}</Text></View>
            <View style={styles.row}><Text style={styles.boldLabel}>(f) Passport No:</Text><Text style={styles.valueText}>N/A</Text></View>
            <View style={styles.row}><Text style={styles.boldLabel}>(g) Occupation:</Text><Text style={styles.valueText}>{comp.occupation?.toUpperCase() || 'N/A'}</Text></View>
            <View style={styles.row}><Text style={styles.boldLabel}>(h) Address:</Text><Text style={styles.valueText}>{comp.address?.toUpperCase() || 'N/A'}</Text></View>
          </View>
        </View>

        {/* Item 7 */}
        <View style={styles.itemBlock}>
          <Text style={styles.boldLabel}>7. Details of known/suspected/unknown accused with full particulars:</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={[styles.tableColHeader, { width: '10%' }]}><Text>S.No</Text></View>
              <View style={[styles.tableColHeader, { width: '25%' }]}><Text>Name</Text></View>
              <View style={[styles.tableColHeader, { width: '20%' }]}><Text>Alias</Text></View>
              <View style={[styles.tableColHeader, { width: '20%' }]}><Text>Relative's Name</Text></View>
              <View style={[styles.tableColHeader, { width: '25%', borderRightWidth: 0 }]}><Text>Present Address</Text></View>
            </View>
            {accusedList.length > 0 ? accusedList.map((acc: any, idx: number) => (
              <View style={styles.tableRow} key={idx}>
                <View style={[styles.tableCol, { width: '10%' }]}><Text>{idx + 1}</Text></View>
                <View style={[styles.tableCol, { width: '25%' }]}><Text>{acc.name}</Text></View>
                <View style={[styles.tableCol, { width: '20%' }]}><Text>{acc.alias || 'N/A'}</Text></View>
                <View style={[styles.tableCol, { width: '20%' }]}><Text>{acc.relative_name || 'N/A'}</Text></View>
                <View style={[styles.tableCol, { width: '25%', borderRightWidth: 0 }]}><Text>{acc.address || 'N/A'}</Text></View>
              </View>
            )) : (
              <View style={styles.tableRow}>
                <View style={[styles.tableCol, { width: '10%' }]}><Text>1</Text></View>
                <View style={[styles.tableCol, { width: '25%' }]}><Text>Unknown</Text></View>
                <View style={[styles.tableCol, { width: '20%' }]}><Text>N/A</Text></View>
                <View style={[styles.tableCol, { width: '20%' }]}><Text>N/A</Text></View>
                <View style={[styles.tableCol, { width: '25%', borderRightWidth: 0 }]}><Text>N/A</Text></View>
              </View>
            )}
          </View>
        </View>

        {/* Item 8 */}
        <View style={styles.itemBlock}>
          <Text style={styles.boldLabel}>8. Reasons for delay in reporting by the complainant / informant:</Text>
          <Text>N/A</Text>
        </View>

        {/* Item 9 */}
        <View style={styles.itemBlock}>
          <Text style={styles.boldLabel}>9. Particulars of properties of interest:</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={[styles.tableColHeader, { width: '10%' }]}><Text>S.No</Text></View>
              <View style={[styles.tableColHeader, { width: '25%' }]}><Text>Category</Text></View>
              <View style={[styles.tableColHeader, { width: '25%' }]}><Text>Type</Text></View>
              <View style={[styles.tableColHeader, { width: '25%' }]}><Text>Description</Text></View>
              <View style={[styles.tableColHeader, { width: '15%', borderRightWidth: 0 }]}><Text>Value(Rs)</Text></View>
            </View>
            {propList.length > 0 ? propList.map((prop: any, idx: number) => (
              <View style={styles.tableRow} key={idx}>
                <View style={[styles.tableCol, { width: '10%' }]}><Text>{idx + 1}</Text></View>
                <View style={[styles.tableCol, { width: '25%' }]}><Text>{prop.category}</Text></View>
                <View style={[styles.tableCol, { width: '25%' }]}><Text>{prop.type}</Text></View>
                <View style={[styles.tableCol, { width: '25%' }]}><Text>{prop.description}</Text></View>
                <View style={[styles.tableCol, { width: '15%', borderRightWidth: 0 }]}><Text>{prop.estimated_value || 'N/A'}</Text></View>
              </View>
            )) : (
              <View style={styles.tableRow}>
                <View style={[styles.tableCol, { width: '10%' }]}><Text>1</Text></View>
                <View style={[styles.tableCol, { width: '25%' }]}><Text>N/A</Text></View>
                <View style={[styles.tableCol, { width: '25%' }]}><Text>N/A</Text></View>
                <View style={[styles.tableCol, { width: '25%' }]}><Text>N/A</Text></View>
                <View style={[styles.tableCol, { width: '15%', borderRightWidth: 0 }]}><Text>0</Text></View>
              </View>
            )}
          </View>
        </View>

        {/* Item 10 */}
        <View style={styles.itemBlock}>
          <View style={styles.row}>
            <Text style={styles.boldLabel}>10. Total value of property (In Rs/-):</Text>
            <Text style={styles.valueText}>{totalValue > 0 ? totalValue : 'N/A'}</Text>
          </View>
        </View>

        {/* Item 11 */}
        <View style={styles.itemBlock}>
          <View style={styles.row}>
            <Text style={styles.boldLabel}>11. Inquest Report / U.D. case No., if any:</Text>
            <Text style={styles.valueText}>N/A</Text>
          </View>
        </View>

        {/* Item 12 */}
        <View style={styles.itemBlock}>
          <Text style={styles.boldLabel}>12. First Information contents (Attach separate sheet, if necessary):</Text>
          <View style={styles.narrativeBlock}>
            <Text>{draft.incident_narrative || 'No narrative provided.'}</Text>
          </View>
        </View>

        {/* Item 13 */}
        <View style={styles.itemBlock}>
          <Text style={styles.boldLabel}>13. Action taken:</Text>
          <Text>Since the above information reveals commission of offence (s) u/s as mentioned at Item No. 2:</Text>
          <Text style={{ marginLeft: 15, marginTop: 4 }}>
            (1) Registered the case and took up the investigation.
          </Text>
          <Text style={{ marginTop: 10 }}>
            F.I.R. read over to the complainant / informant, admitted to be correctly recorded and a copy given to the complainant, free of cost.
          </Text>
          <Text style={{ marginTop: 5 }}>R.O.A.C.</Text>
        </View>

        {/* Items 14 & 15 */}
        <View style={styles.signatureSection} wrap={false}>
          <View style={styles.signatureBlock}>
            <Text>{"\n\n\n"}</Text>
            <Text>Signature/Thumb impression</Text>
            <Text>of the complainant / informant</Text>
          </View>
          
          <View style={styles.signatureBlock}>
            <Text>{"\n\n\n"}</Text>
            <Text>Signature of Officer in charge</Text>
            <Text>Name: {officer?.name?.toUpperCase()}</Text>
            <Text>Rank: {officer?.rank?.toUpperCase() || 'INSPECTOR'}</Text>
            <Text>No: {officer?.badge_number || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.itemBlock}>
          <Text style={{ marginTop: 20 }}>
            <Text style={styles.boldLabel}>15. Date and time of dispatch to the court: </Text>
            {new Date().toLocaleString('en-IN')}
          </Text>
        </View>

      </Page>
    </Document>
  );
};
